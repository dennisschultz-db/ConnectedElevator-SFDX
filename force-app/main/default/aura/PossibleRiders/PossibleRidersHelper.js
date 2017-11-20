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

                // Subscribe to MotionDetected (raised by elevator panel when button pressed)
                subscriptions.push(
                    cometd.subscribe(
                    	'/event/MotionDetected__e',
                    	function(platformEvent) {
                        	console.log('MotionDetected platform event received: '+ JSON.stringify(platformEvent));
                        	helper.onMotionDetected(component, platformEvent);
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
    onMotionDetected : function (component, platformEvent) {
        console.log('Recieved Notification of motion detected');
        
        component.set("v.predictions", null);
    },
    
    onReceiveRiderPredicted : function(component, platformEvent) {
        console.log('Recieved Notification of rider predicted');
        var helper = this;
        // Extract notification from platform event
        var newNotification = {
            time : $A.localizationService.formatDateTime(
                platformEvent.data.payload.CreatedDate, 'HH:mm'),
            rideId : platformEvent.data.payload.RideId__c
        };
        
        var action = component.get("c.getPredictionsFromRide");
        action.setParams({
            rideId: newNotification.rideId
        });
        action.setCallback(this, function(a) {
            console.log('callback');
            var state = a.getState();
            if (state === 'ERROR') {
                console.log(a.getError());
                alert("An error has occurred");
            } else {
                if (!a.getReturnValue()=='') {
                    console.log('returned a is ' + JSON.stringify(a.getReturnValue()));
                    component.set("v.predictions", a.getReturnValue());
                }
            }
            
        });
        $A.enqueueAction(action);
        
    },

    
    onReceiveRideComplete : function(component, platformEvent) {
        console.log('Recieved Notification of completed ride');
        var helper = this;
        
//        component.set("v.predictions", []);
        
    }
    

})