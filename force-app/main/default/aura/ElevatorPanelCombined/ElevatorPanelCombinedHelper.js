({
    footballVideo   : "https://www.youtube.com/embed/Zlhu68lzCow?autoplay=true&start=142",
    baseballVideo   : "https://www.youtube.com/embed/lRTUIBVfLP4?autoplay=true&start=2",
    hockeyVideo     : "https://www.youtube.com/embed/JDnZTUkCOBQ?autoplay=true&start=6",
    basketballVideo : "https://www.youtube.com/embed/WaYAhkH2cJM?autoplay=true&start=15",
    curlingVideo    : "https://www.youtube.com/embed/BpBisfRoVoM?autoplay=true&start=25",
    iotVideo        : "https://www.youtube.com/embed/OlE5N-wOBWM?autoplay=true",
    defaultVideo    : "https://www.youtube.com/embed/8yS882bWjIY?autoplay=true",

    rockData      : {artistName: "Queen", songTitle: "Bohemian Rapsody"},
    countryData   : {artistName: "Tammy Wynette", songTitle: "Stand By Your Man"},
    hipHopData    : {artistName: "Outkast", songTitle: "Hey Yah!"},
    classicData   : {artistName: "Beethoven", songTitle: "Symphony No. 9"},
    showTunesData : {artistName: "Julie Andrews", songTitle: "The Sound of Music"},
    defaultData   : {artistName: "Frank Sinatra", songTitle: "The Girl from Ipanema"},
    
    connectCometd : function(component) {
        var helper = this;
        
        // Configure CometD
        var cometdUrl = window.location.protocol+'//'+window.location.hostname+'/cometd/40.0/';
        var cometd = component.get('v.cometd');
        cometd.configure({
            url: cometdUrl,
            requestHeaders: { Authorization: 'OAuth '+ component.get('v.sessionId')},
            appendMessageTypeToURL : false
        });
        cometd.websocketEnabled = false;
        
        // Establish CometD connection
        console.log('Connecting to CometD: '+ cometdUrl);
        cometd.handshake(function(handshakeReply) {
            if (handshakeReply.successful) {
                console.log('Connected to CometD.');
                
                // Get current subscription list
                var subscriptions = component.get('v.cometdSubscriptions');

                // Subscribe to ApproachingRider (raised by Pi when picture has been taken).
                subscriptions.push(
                    cometd.subscribe(
                    	'/event/ApproachingRider__e',
                    	function(platformEvent) {
                        	console.log('Approaching Rider platform event received: '+ JSON.stringify(platformEvent));
                        	helper.onReceiveApproachingRider(component, platformEvent);
                    	})
                );
                // Subscribe to Rider_Predicted (raised by Apex when EV prediction is returned)
                subscriptions.push(
                    cometd.subscribe(
                    	'/event/Rider_Predicted__e',
                    	function(platformEvent) {
                        	console.log('Rider Predicted platform event received: '+ JSON.stringify(platformEvent));
                        	helper.onReceiveRiderPredicted(component, platformEvent);
                    	})
                );
                // Subscribe to Ride_Complete (raised by Apex when EV prediction is returned)
                subscriptions.push(
                    cometd.subscribe(
                    	'/event/Ride_Complete__e',
                    	function(platformEvent) {
                        	console.log('Ride Complete platform event received: '+ JSON.stringify(platformEvent));
                        	helper.onReceiveRideComplete(component, platformEvent);
                    	})
                );
                
                // Update subscription list
                component.set('v.cometdSubscriptions', subscriptions);
            }
            else
                console.error('Failed to connected to CometD.');
        });
    },
    
    
    disconnectCometd : function(component) {
        var cometd = component.get('v.cometd');
        
        // Unsuscribe all CometD subscriptions
        cometd.batch(function() {
            var subscriptions = component.get('v.cometdSubscriptions');
            subscriptions.forEach(function (subscription) {
                cometd.unsubscribe(subscription);
            });
        });
        component.set('v.cometdSubscriptions', []);
        
        // Disconnect CometD
        cometd.disconnect();
        console.log('CometD disconnected.');
    },

    
	// Button Action handlers    
    onFloorClick : function(component, event) {
        var floorToGoTo = event.currentTarget.id;
        console.log('onFloorClick go to floor ' + floorToGoTo);
        
        var action = component.get("c.goToFloor");
        action.setParams({
            floor : floorToGoTo
        });
        action.setCallback(this, function(response) {
            var state = response.getState();
            if (state === "SUCCESS") {
                console.log("Went to floor " + floorToGoTo);
            } else {
                console.log("Error moving to floor");
            }
        });
        
        $A.enqueueAction(action);  
    },
    
    
    onDemoButtonPress : function(component, event) {
        console.log('onDemoButtonPress');
        
        component.set('v.message', 'Someone is approaching the elevator...');
        
        var action = component.get("c.motionDetected");
        action.setCallback(this, function(response) {
            var state = response.getState();
            if (state === "SUCCESS") {
                console.log("Started the photo process ");
            } else {
                console.log("Error moving to floor");
            }
        });
        
        $A.enqueueAction(action);
    },
    
    
    // Platform Event action handlers
    onReceiveApproachingRider : function(component, platformEvent) {
        console.log('Recieved Notification of approaching rider');
        var helper = this;
        
        // Display message in cell
        component.set(
            'v.message',
            'Someone is approaching the elevator...<br>' + 
            'Processing picture...');            
    },


    onReceiveRiderPredicted : function(component, platformEvent) {
        console.log('Recieved Notification of rider predicted');
        var helper = this;
        // Extract notification from platform event
        var newNotification = {
            time : $A.localizationService.formatDateTime(
                platformEvent.data.payload.CreatedDate, 'HH:mm'),
            known : platformEvent.data.payload.Known__c,
            name  : platformEvent.data.payload.Name__c,
            sport : platformEvent.data.payload.Favorite_Sport__c,
            music : platformEvent.data.payload.Favorite_Music__c,
            floor : platformEvent.data.payload.Office_Floor__c
        };
        
        // Display message in cell
        if (newNotification.known == true) {
        	component.set(
            	'v.message',
            	'Hi, <b>' + newNotification.name + '</b>!<br>' +
            	'  Let\'s get you to floor <b>' + newNotification.floor + '</b> ASAP!<br>' +
            	'  Did you watch <b>' + newNotification.sport + '</b> last night?<br>' +
            	'  Enjoy listening to some <b>' + newNotification.music + '</b> during our ride.');
            // Video
            switch (newNotification.sport) {
                case "Football":
                    component.set("v.videoUrl", helper.footballVideo);
                    break;
                case "Baseball":
                    component.set("v.videoUrl", helper.baseballVideo);
                    break;
                case "Hockey":
                    component.set("v.videoUrl", helper.hockeyVideo);
                    break;
                case "Basketball":
                    component.set("v.videoUrl", helper.basketballVideo);
                    break;
                case "Curling":
                    component.set("v.videoUrl", helper.curlingVideo);
                    break;
            }

            // Audio
            helper.setMusic (newNotification.music, component);
           
        } else {
            component.set(
            	'v.message',
                'Hello, <b>Stranger</b>!<br>' +
                '  Use the buttons on the panel to tell me where to go.<br><br>' +
                '  Since we don\'t know each other, check out this <b>Salesforce IoT promo</b>.  This will rock your world.  Seriously.');

            // Video
            component.set("v.videoUrl", helper.iotVideo);
            
            // Audio
            helper.setMusic ('default', component);

        }
    },

    
    onReceiveRideComplete : function(component, platformEvent) {
        console.log('Recieved Notification of completed ride');
        var helper = this;
        
        // Display message in cell
        component.set(
            'v.message',
            'Thanks for riding the Lego Cube Dwellers Elevator!'); 
        
        // Video
        component.set("v.videoUrl", helper.defaultVideo);
        
        // Audio
        helper.setMusic('default', component);
    },
    
    // Utility functions
    setMusic: function(selection, component) {
        
        var helper = this;
        var data;
        switch (selection) {
            case "Rock":
                data = helper.rockData;
                break;
            case "Country":
                data = helper.countryData;
                break;
            case "Hip Hop":
                data = helper.hipHopData;
                break;
            case "Classic":
                data = helper.classicData;
                break;
            case "Show Tunes":
                data = helper.showTunesData;
                break;
            case "default":
                data = helper.defaultData;
                break;
            default:
                data = helper.defaultData;
                break;
        }
        
        console.log('setMusic to ' + data.artistName);
        
        component.set("v.nowPlayingText", '<b>' + data.songTitle + '</b><br>by<br><b>' + data.artistName + '</b>');
    }

    
})