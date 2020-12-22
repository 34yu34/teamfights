/// <reference types="minecraft-scripting-types-client" />

interface IPlayerConnectedEventData 
{
	player: IEntity
}

namespace Client {
	const system = client.registerSystem(0, 0)
	let player: IEntity; 

	// Setup which events to listen for
	system.initialize = () => {
		system.listenForEvent("minecraft:ui_event", (eventData) => onUIMessage(eventData))

		system.listenForEvent("minecraft:client_entered_world", (eventData) => onClientEnteredWorld(eventData))

		// Enable full logging, useful for seeing errors, you will probably want to disable this for
		// release versions of your scripts.
		// Generally speaking it's not recommended to use broadcastEvent in initialize, but for configuring logging it's fine.
		const scriptLoggerConfig = system.createEventData(SendToMinecraftClient.ScriptLoggerConfig)
		scriptLoggerConfig.data.log_errors = true
		scriptLoggerConfig.data.log_information = true
		scriptLoggerConfig.data.log_warnings = true
		system.broadcastEvent(SendToMinecraftClient.ScriptLoggerConfig, scriptLoggerConfig)

		system.registerEventData("teamfights:game_start", {})
	}

	system.update = () => {
	}

	const collectPlayerData = (eventData: IEventData<IClientEnteredWorldEventData>) => {
		player = eventData.data.player
		system.broadcastEvent("teamfights:player_connected", eventData)
	}

	const startGame = () => {
		let startEventData = system.createEventData("teamfights:game_start")
		system.broadcastEvent("teamfights:game_start", startEventData)
	}

	const onUIMessage = (eventDataObject: any) => {
		//Get the data out of the event data object. If there's no data, nothing to do inside here
		let eventData = eventDataObject.data
		if (!eventData) {
			return
		}
	
		// UI engine sent us an event.
		if (eventData === "startPressed" ) {
			startGame()
		}
	}

	const onClientEnteredWorld = (eventData: any) => {
		// Client has entered the world, show the starting screen
		let loadEventData = system.createEventData("minecraft:load_ui")
		loadEventData.data.path = "rpg_game_start.html"
		loadEventData.data.options.is_showing_menu = true
		loadEventData.data.options.absorbs_input = true
		loadEventData.data.options.render_only_when_topmost = false
		system.broadcastEvent("minecraft:load_ui", loadEventData)
	}
}
