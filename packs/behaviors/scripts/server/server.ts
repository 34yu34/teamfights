/// <reference types="minecraft-scripting-types-server" />

namespace Server {
	const SECOND: number = 20
	const MINUTE: number = 60

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
			system.executeCommand(`tp @a effect slow_falling 30 1 true`, () => { })
			for (let i = 0; i < this.players.length; ++i)
			{
				system.executeCommand(`tp ${this.players[i].name} ${this.position.x} 100 ${this.position.z}`, () => {})
			}
		}
	}

	class Game {
		static readonly REDUCE_TICK: number = 2 * MINUTE * SECOND
		static readonly REDUCE_RATIO: number = 0.9
		static readonly START_RADIUS: number = 500

		teams: Team[]
		players: Player[]
		timer: number
		radius: number
		broadcastedGameStarted: boolean

		constructor(players: Player[], noOfTeam: number = 2) {
			this.players = players
			this.timer = 0
			this.broadcastedGameStarted = false
			this.radius = Game.START_RADIUS

			this.makeTeams(noOfTeam)

			for (let team of this.teams) {
				team.tp()
			}
		}

		makeTeams(noOfTeam: number = 2) {
			this.players.sort(() => 0.5 - Math.random())

			this.teams = new Array(noOfTeam)

			for (let i = 0; i < this.players.length; ++i) {
				let team = this.teams[i % noOfTeam]

				if (team == null) {
					this.teams[i % noOfTeam] = new Team()
					team = this.teams[i % noOfTeam]
				}

				team.players.push(this.players[i])
			}

			let angle: number = 2 * Math.PI / noOfTeam;
			for (let i = 0; i < this.teams.length; ++i) {
				this.teams[i].id = i
				this.teams[i].position.x = Game.REDUCE_RATIO * this.radius * Math.round(Math.sin(angle * i) * 100) / 100
				this.teams[i].position.z = Game.REDUCE_RATIO * this.radius * Math.round(Math.cos(angle * i) * 100) / 100
			}
		}

		update() {
			this.timer += 1

			if (this.timer % (SECOND / 2)) {
				giveEffectToPlayersOutsideBorders(this.radius)
			}

			if (this.timer % Game.REDUCE_TICK === 0) // every reduction time
			{
				this.radius = Math.round(this.radius * Game.REDUCE_RATIO)
			}
			else if (this.timer > (30 * SECOND)
				&& (this.timer % SECOND === 0)
				&& ((Game.REDUCE_TICK - (this.timer % Game.REDUCE_TICK)) / SECOND) < 31)
			{
				alertPlayersWorldBorderReducing(
					this.radius * Game.REDUCE_RATIO,
					(Game.REDUCE_TICK - (this.timer % Game.REDUCE_TICK)) / SECOND
				)
            }
			else if (this.timer % (MINUTE * SECOND) === 0) // every minute
			{
				warnPlayersWorldBorderReducing(
					this.radius * Game.REDUCE_RATIO,
					(Game.REDUCE_TICK - (this.timer % Game.REDUCE_TICK)) / SECOND
				)
			}
		}
	}

	const players: Player[] = []
	let game: Game

	// Setup which events to listen for
	system.initialize = function () {
		system.listenForEvent(ReceiveFromMinecraftServer.EntityDeath, onEntityDeath)
		system.listenForEvent("teamfights:player_connected", addPlayer)
		system.listenForEvent("teamfights:game_start", startGame)

		const scriptLoggerConfig = system.createEventData(SendToMinecraftServer.ScriptLoggerConfig)
		scriptLoggerConfig.data.log_errors = true
		scriptLoggerConfig.data.log_information = true
		scriptLoggerConfig.data.log_warnings = true
		system.broadcastEvent(SendToMinecraftServer.ScriptLoggerConfig, scriptLoggerConfig)

		system.registerEventData("teamfights:game_started", {})
		system.registerEventData("teamfights:game_ended", {})
	}

	// per-tick updates
	system.update = function() {
		if (game == null) {
			return
		}

		if (!game.broadcastedGameStarted) {
			game.broadcastedGameStarted = true

			const data : IEventData<any> = system.createEventData("teamfights:game_started")
			system.broadcastEvent("teamfights:game_started", data)

			warnGameStarted()
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

	const startGame = (eventData: any) => {
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
		system.executeCommand(`title @a actionbar Reduction to ${newRadius} in ${secondsLeft} seconds`, (cb) => {})
	}

	const alertPlayersWorldBorderReducing = (newRadius: number, secondsLeft: number) => {
		system.executeCommand(`title @a actionbar §4Reduction to ${newRadius} in ${secondsLeft}...`, (cb) => { })
	}

	const warnGameStarted = () => {
		system.executeCommand(`title @a title The game has begun!`, (cb) => { })
		system.executeCommand(`title @a subtitle Good luck!`, (cb) => {})
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

