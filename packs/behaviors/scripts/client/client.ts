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

		system.listenForEvent("teamfights:game_started", (eventData) => onGameStarted(eventData))
		system.listenForEvent("teamfights:game_ended", (eventData) => onGameEnd(eventData))

		// Enable full logging, useful for seeing errors, you will probably want to disable this for
		// release versions of your scripts.
		// Generally speaking it's not recommended to use broadcastEvent in initialize, but for configuring logging it's fine.
		const scriptLoggerConfig = system.createEventData(SendToMinecraftClient.ScriptLoggerConfig)
		scriptLoggerConfig.data.log_errors = true
		scriptLoggerConfig.data.log_information = true
		scriptLoggerConfig.data.log_warnings = true
		system.broadcastEvent(SendToMinecraftClient.ScriptLoggerConfig, scriptLoggerConfig)

		system.registerEventData("teamfights:game_start", {})
		system.registerEventData("teamfights:player_connected", {})

		system.registerEventData("teamfights:set_radius", { radius: 250 })
		system.registerEventData("teamfights:set_teams_number", { teamsNumber: 2 })
		system.registerEventData("teamfights:set_reduction_time", { reductionTime: 2 })
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
		if (eventData === "startPressed") {
			startGame()
		} else {
			const match = eventData.match(/(\w+):(\w+)/)
			switch (match[1]) {
				case 'teamNumberButtonPressed':
					let teamsNumberEventData = system.createEventData("teamfights:set_teams_number")
					teamsNumberEventData.data.teamsNumber = +match[2]
					system.broadcastEvent("teamfights:set_teams_number", teamsNumberEventData)
					break

				case 'radiusButtonPressed':
					let radiusEventData = system.createEventData("teamfights:set_radius")
					radiusEventData.data.radius = +match[2]
					system.broadcastEvent("teamfights:set_radius", radiusEventData)
					break

				case 'reductionTimeButtonPressed':
					let radiusReductionTimeEventData = system.createEventData("teamfights:set_reduction_time")
					radiusReductionTimeEventData.data.reductionTime = +match[2]
					system.broadcastEvent("teamfights:set_reduction_time", radiusReductionTimeEventData)
					break;
			}
        }
	}

	const onClientEnteredWorld = (eventData: any) => {
		// Client has entered the world, show the starting screen
		collectPlayerData(eventData)
		loadUI("start_menu.html")
	}

	const onGameStarted = (eventData: any) => {
		unloadUI("start_menu.html")
	}

	const onGameEnd = (eventData: any) => {
		loadUI("start_menu.html")
	}

	const loadUI = (uiPath: string) => {
		let loadEventData = system.createEventData("minecraft:load_ui")
		loadEventData.data.path = uiPath
		loadEventData.data.options.is_showing_menu = true
		loadEventData.data.options.absorbs_input = true
		system.broadcastEvent("minecraft:load_ui", loadEventData)
	}

	const unloadUI = (uiPath: string) => {
		let unloadEventData = system.createEventData("minecraft:unload_ui")
		unloadEventData.data.path = uiPath
		system.broadcastEvent("minecraft:unload_ui", unloadEventData)
    }
}
