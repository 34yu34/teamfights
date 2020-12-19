/// <reference types="minecraft-scripting-types-server" />

namespace Server {
	const system = server.registerSystem(0, 0)

	class Player implements IEntity {
		readonly __identifier__: string
		readonly __type__: "entity" | "item_entity"
		readonly id: number
		readonly name: string

		constructor(player: IEntity) {
			this.__identifier__ = player.__identifier__
			this.__type__ = player.__type__
			this.id = player.id
			let component: IComponent<INameableComponent> = system.getComponent(player, MinecraftComponent.Nameable)
			this.name = component.data.name
		}
	}

	class Team {
		players: Player[]
		position: VectorXYZ
		id: number

		constructor() {
			this.players = [];
			this.id = 0;
			this.position = {x: 0, y: 0, z: 0}
		}

		tp() {
			for (let i = 0; i < this.players.length; ++i)
			{
				system.executeCommand(`/tp ${this.players[i].name} ${this.position.x} 80 ${this.position.z}`, () => {})
			}
		}
	}

	class Game {
		REDUCE_TICK: number = 5 * 200 * 60
		REDUCE_RATIO: number = 0.9
		START_RADIUS: number = 500

		teams: Team[]
		players: Player[]
		timer: number
		radius: number
		started: boolean

		constructor(players: Player[], noOfTeam: number = 2) {
			this.players = players
			this.timer = 0;
			this.makeTeams(noOfTeam)
		}

		makeTeams(noOfTeam: number = 2) {
			this.players.sort(() => 0.5 - Math.random())

			this.teams = new Array(noOfTeam).map(() => new Team())

			for (let i = 0; i < this.players.length; ++i) {
				this.teams[i % noOfTeam].players.push(this.players[i])
			}

			let angle: number = 2 * Math.PI / noOfTeam;

			for (let i = 0; i < this.teams.length; ++i) {
				this.teams[i].id = i
				this.teams[i].position.x = this.REDUCE_RATIO * this.radius * Math.sin(angle * i)
				this.teams[i].position.y = this.REDUCE_RATIO * this.radius * Math.cos(angle * i)
			}
		}


		update() {
			this.timer += 1
			giveEffectToPlayersOutsideBorders(this.radius)

			// every second
			if (this.timer % 200 === 0)
			{
				warnPlayersWorldBorderReducing(this.radius * this.REDUCE_RATIO, (this.REDUCE_TICK / 200) % (this.timer / 200))
			}

			// every reduction time
			if (this.timer % this.REDUCE_TICK === 0)
			{
				this.radius *= this.REDUCE_RATIO;
			}
		}
	}

	const players: Player[] = []
	let game: Game

	// Setup which events to listen for
	system.initialize = function () {

		system.listenForEvent(ReceiveFromMinecraftServer.EntityDeath, onEntityDeath)
		system.listenForEvent("teamfights:player_connected", addPlayer)

		const scriptLoggerConfig = system.createEventData(SendToMinecraftServer.ScriptLoggerConfig)
		scriptLoggerConfig.data.log_errors = true
		scriptLoggerConfig.data.log_information = true
		scriptLoggerConfig.data.log_warnings = true
		system.broadcastEvent(SendToMinecraftServer.ScriptLoggerConfig, scriptLoggerConfig)
	}

	// per-tick updates
	system.update = function() {
		if (game == null) {
			return
		}

		game.update()
	}

	const sendMessage = (message: string) => {
		const data : IEventData<IDisplayChatParameters> = system.createEventData(SendToMinecraftServer.DisplayChat)
		data.data.message = message
		system.broadcastEvent(SendToMinecraftServer.DisplayChat, data)
	}

	const onEntityDeath = (event: IEventData<IEntityDeathEventData>) => {
		if (event.data.entity.__identifier__ == "minecraft:player") {
			makeObserver(new Player(event.data.entity))
		}
	}

	const makeObserver = (player: Player) => {
		system.executeCommand(`effect ${player.name} invisibility 99999 255 true`, () => {})
		system.executeCommand(`gamemode ${player.name} a`, () => {})
		system.executeCommand(`effect ${player.name} resistance 99999 255 true`, () => {})
		system.executeCommand(`effect ${player.name} weakness 99999 255 true`, () => {})
	}

	const startGame = () => {
		game = new Game(players)
	}

	const addPlayer = (event: IEventData<IClientEnteredWorldEventData>) => {
		const player = new Player(event.data.player)
		if (!players.find((p: Player) => {p.name == player.name}))
		{
			players.push(player)
			sendMessage(`Player ${player.name} has connected`)
		}
	}

	const warnPlayersWorldBorderReducing = (newRadius: number, secondsLeft: number) => {
		system.executeCommand(`title @a title "Reducing world border to ±${newRadius}²"`, (cb) => {})
		system.executeCommand(`title @a subtitle "in ${secondsLeft} seconds`, (cb) => {})
	}

	const giveEffectToPlayersOutsideBorders = (radius: number) => {
		system.executeCommand(`title @a[x=${radius},dx=+5000,y=0,dy=255,z=-5000,dz=10000] actionbar §l§4You are past the border!`, (cb) => {})
		system.executeCommand(`title @a[x=${-radius},dx=-5000,y=0,dy=255,z=-5000,dz=10000] actionbar §l§4You are past the border!`, (cb) => {})
		system.executeCommand(`title @a[x=-5000,dx=10000,y=0,dy=255,z=${radius},dz=5000] actionbar §l§4You are past the border!`, (cb) => {})
		system.executeCommand(`title @a[x=-5000,dx=10000,y=0,dy=255,z=${-radius},dz=-5000] actionbar §l§4You are past the border!`, (cb) => {})

		system.executeCommand(`effect @a[x=${radius},dx=+5000,y=0,dy=255,z=-5000,dz=10000] wither 1 1 true`, (cb) => {})
		system.executeCommand(`effect @a[x=${-radius},dx=-5000,y=0,dy=255,z=-5000,dz=10000] wither 1 1 true`, (cb) => {})
		system.executeCommand(`effect @a[x=-5000,dx=10000,y=0,dy=255,z=${radius},dz=5000] wither 1 1 true`, (cb) => {})
		system.executeCommand(`effect @a[x=-5000,dx=10000,y=0,dy=255,z=${-radius},dz=-5000] wither 1 1 true`, (cb) => {})
	}
}

