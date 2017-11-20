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
                // Subscribe to ApproachingRider (raised by Pi when picture has been taken).
                subscriptions.push(
                    cometd.subscribe(
                    	'/event/ApproachingRider__e',
                    	function(platformEvent) {
                        	console.log('Approaching Rider platform event received: '+ JSON.stringify(platformEvent));
                        	helper.onReceiveApproachingRider(component, platformEvent);
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
        
        component.set('v.pictureUrl', '');
    },
    
    onReceiveApproachingRider : function(component, platformEvent) {
        console.log('Recieved Notification of approaching rider');
        var helper = this;
        // Extract notification from platform event
        var newNotification = {
            time : $A.localizationService.formatDateTime(
                platformEvent.data.payload.CreatedDate, 'HH:mm'),
            pictureId : platformEvent.data.payload.RiderPictureId__c
        };
        
        component.set(
            'v.pictureUrl',
            '/sfc/servlet.shepherd/version/download/' + newNotification.pictureId);            
    },

    
    onReceiveRideComplete : function(component, platformEvent) {
        console.log('Recieved Notification of completed ride');
        var helper = this;
        
//        component.set(
//            'v.pictureUrl',
//            '');            
    }

})