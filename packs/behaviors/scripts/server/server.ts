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
	var system = server.registerSystem(0, 0);
	let players: Player[];

	// Setup which events to listen for
	system.initialize = function () {
		// Register any events you will send to the client
		// system.registerEventData(...)

		// Register any components you will attach to game objects
		// system.registerComponent(...)

		// Set up any events you wish to listen to
		players = []

		system.listenForEvent("minecraft:entity_death", onEntityDeath)
		system.listenForEvent("teamfights:pinky", receivePinkyMessage);
		system.listenForEvent("teamfights:player_connected", addPlayer)

		// Enable full logging, useful for seeing errors, you will probably want to disable this for
		// release versions of your scripts.
		// Generally speaking it's not recommended to use broadcastEvent in initialize, but for configuring logging it's fine.
		const scriptLoggerConfig = system.createEventData(SendToMinecraftServer.ScriptLoggerConfig);
		scriptLoggerConfig.data.log_errors = true;
		scriptLoggerConfig.data.log_information = true;
		scriptLoggerConfig.data.log_warnings = true;
		system.broadcastEvent(SendToMinecraftServer.ScriptLoggerConfig, scriptLoggerConfig);


	}

	// per-tick updates
	system.update = function() {
		// Any logic that needs to happen every tick on the server.
	}

	function receivePinkyMessage(parameters: IEventData<{narf: boolean}>) {
		if (parameters.data.narf) {
			var displayChatEvent = system.createEventData(SendToMinecraftServer.DisplayChat);
			displayChatEvent.data.message = "The same thing we do every night Client. TRY TO TAKE OVER THE WORLD.";
			system.broadcastEvent(SendToMinecraftServer.DisplayChat, displayChatEvent);
		}
	}

	function sendMessage(message: string)
	{
		const data : IEventData<IDisplayChatParameters> = system.createEventData(SendToMinecraftServer.DisplayChat);
		data.data.message = message;
		system.broadcastEvent(SendToMinecraftServer.DisplayChat, data);
	}

	const onEntityDeath = (event: IEventData<IEntityDeathEventData>) =>
	{
		if (event.data.entity.__identifier__ == "minecraft:player")
		{
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

