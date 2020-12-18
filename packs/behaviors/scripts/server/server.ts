/// <reference types="minecraft-scripting-types-server" />

class Player implements IEntity
{
	readonly __identifier__: string;
	readonly __type__: "entity" | "item_entity";
	readonly id: number;
}

class Team
{
    players : Player[]
    id : number

    constructor()
    {
		this.players = [];
		this.id = 0;
    }
};

class Game
{
    teams: Team[]
    players: Player[]

    constructor(players: Player[], noOfTeam: number = 2)
    {
        this.players = players;
        this.makeTeams(noOfTeam);
    }

    makeTeams(noOfTeam: number = 2)
    {
        this.players.sort(() => 0.5 - Math.random());

		this.teams = new Array(noOfTeam).map(() => new Team())
		
        for (let i = 0; i < this.players.length; ++i)
        {
            this.teams[i % noOfTeam].players.push(this.players[i])
		}
		
		for(let i = 0; i < this.teams.length; ++i)
		{
			this.teams[i].id = i;
		}
    }
};


namespace Server {
	const system = server.registerSystem(0, 0);
	const players: Player[] = [];

	// Setup which events to listen for
	system.initialize = function () {
		const scriptLoggerConfig = system.createEventData(SendToMinecraftServer.ScriptLoggerConfig);
		scriptLoggerConfig.data.log_errors = true;
		scriptLoggerConfig.data.log_information = true;
		scriptLoggerConfig.data.log_warnings = true;
		system.broadcastEvent(SendToMinecraftServer.ScriptLoggerConfig, scriptLoggerConfig);
	}

	// per-tick updates
	system.update = function() {
		system.executeCommand("/say testing 1 2", (cb) => {});
	}

	function sendMessage(message: string) {
		const data : IEventData<IDisplayChatParameters> = system.createEventData(SendToMinecraftServer.DisplayChat);
		data.data.message = message;
		system.broadcastEvent(SendToMinecraftServer.DisplayChat, data);
	}

	const onEntityDeath = (event: IEventData<IEntityDeathEventData>) => {
		if (event.data.entity.__identifier__ == "minecraft:player") {
			makeObserver(event.data.entity)
		}
	}

	const makeObserver = (player: Player) => {
		system.executeCommand(`effect ${player.id} invisibility 99999 255 true`, () => {})
		system.executeCommand(`gamemode ${player.id} a`, () => {})
		system.executeCommand(`effect ${player.id} resistance 99999 255 true`, () => {})
		system.executeCommand(`effect ${player.id} weakness 99999 255 true`, () => {})
	}

	const addPlayer = (event: IEventData<IClientEnteredWorldEventData>) =>
	{
		players.push(event.data.player);
		sendMessage(`Player ${event.data.player.id} has connected`)
	}
}

