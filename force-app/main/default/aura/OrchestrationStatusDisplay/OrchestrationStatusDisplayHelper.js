({
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
                
                
                // Subscribe to Rider_Predicted (raised by Apex when EV prediction is returned)
                subscriptions.push(
                    cometd.subscribe(
                        '/event/ApproachingRider__e',
                        function(platformEvent) {
                            console.log('ApproachingRider platform event received: '+ JSON.stringify(platformEvent));
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
    
    
    // Platform Event action handlers
    onReceiveApproachingRider : function(component, platformEvent) {
        console.log('Recieved Notification of approaching rider');
//        component.set('v.staticImageName', 'OrchestrationRiderApproachingMP4');
        component.set('v.staticImageName', 'OrchestrationRiderApproaching');
        
    },
    
    onReceiveRiderPredicted : function(component, platformEvent) {
        console.log('Recieved Notification of rider predicted');
        
        if (platformEvent.data.payload.Known__c) {
//	        component.set('v.staticImageName', 'OrchestrationKnownRiderMP4');
	        component.set('v.staticImageName', 'OrchestrationKnownRider');
            component.set('v.wasLastRiderKnown', 'true');
        } else {
//	        component.set('v.staticImageName', 'OrchestrationUnknownRiderMP4');                    
	        component.set('v.staticImageName', 'OrchestrationUnknownRider');
            component.set('v.wasLastRiderKnown', 'false');
        }
        
    },
    
    onReceiveRideComplete : function(component, platformEvent) {
        console.log('Recieved Notification of completed ride');
        
        if (component.get('v.wasLastRiderKnown')) {
//	        component.set('v.staticImageName', 'OrchestrationKnownToMonitoringMP4');            
 	        component.set('v.staticImageName', 'OrchestrationMonitoring');
        } else{
//	        component.set('v.staticImageName', 'OrchestrationUnknownToMonitoringMP4');            
 	        component.set('v.staticImageName', 'OrchestrationMonitoring');
        }
        
    },
    
})