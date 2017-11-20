global class LegoUtility {
    
    // Invocable version that can be launched from Process Builder
    @InvocableMethod(label='Get Lego Prediction' description='Performs and Einstein Vision prediction')
    global static void getLegoPredictionInvocable (List<LegoPredictionItem> legoPredictionItem) {
        getLegoPredictionAsync(legoPredictionItem[0].rideId);
    }
    
    
    // Asynchronous version needed because Ride will not yet be committed when the invokable
    // is launched in Process Builder.
    @future(callout=true)
    global static void getLegoPredictionAsync(String rideId) {
        getLegoPrediction(rideId);
    }
    
    
    // Synchronous version
    global static void getLegoPrediction(String rideId) {    
        // Get the Ride record
        Ride__c thisRide = [SELECT Id, Name, PictureIdText__c, Elevator__c FROM Ride__c WHERE Id = :rideId];
        
        // Verify there is a string value for the PictureIdText
        if (String.isNotBlank(thisRide.PictureIdText__c)) {
            // Find the ContentVersion (picture file that was created by the Pi)
            ContentVersion cv = [SELECT Id, VersionData, ContentDocumentId FROM ContentVersion WHERE Id = :thisRide.PictureIdText__c];
            Id cdId = cv.ContentDocumentId;
        
            // Find the LegoPeople Einstein model
            EinsteinVision_PredictionService service = new EinsteinVision_PredictionService();
            // Find the first model in the LegoPeople dataset
            EinsteinVision_Dataset[] datasets = service.getDatasets();
            for (EinsteinVision_Dataset dataset : datasets) {
                System.debug('Currentlylooking at dataset ' + dataset.Name);
//                if (dataset.Name.equals('LegoPeople')) {
                if (dataset.Name.equals('LegoPeopleV2')) {
                    EinsteinVision_Model[] models = service.getModels(dataset);
                    EinsteinVision_Model model = models.get(0);
                    System.debug('The modelId being used is ' + model.modelId);
                    
                    // Retrieve the picture content in base64 form
                    String base64 = EncodingUtil.base64Encode(cv.VersionData);
                    
                    // Predict
                    EinsteinVision_PredictionResult result = service.predictBase64(model.modelId, base64, '');
                    System.debug('PredictUrl result ' + result);
                    EinsteinVision_Probability probability = result.probabilities.get(0);
                    
                    // Set the first (most likely) predicted rider, then work your way through three
                    thisRide.Predicted_Rider_1__c = probability.label;
                    thisRide.Confidence_1__c = probability.probability * 100;
                    probability = result.probabilities.get(1);
                    thisRide.Predicted_Rider_2__c = probability.label;
                    thisRide.Confidence_2__c = probability.probability * 100;
                    probability = result.probabilities.get(2);
                    thisRide.Predicted_Rider_3__c = probability.label;
                    thisRide.Confidence_3__c = probability.probability * 100;
                    
                    // Create an event that will be fired, letting the system know we have finished prediction.
                    Asset elevator = [SELECT Id, Recognition_Threshold__c, DeviceId__c FROM Asset WHERE Id= :thisRide.Elevator__c][0];
                    String deviceId = elevator.DeviceId__c;
                    Rider_Predicted__e riderPredicted = new Rider_Predicted__e(
                        Known__c = FALSE, 
                        DeviceId__c = deviceId,
                        RideId__c = thisRide.Id);
                    
                    // If the probability for the first predicted rider is high, link the
                    // contact record to the ride record and populate the event fields.
                    if (thisRide.Confidence_1__c > elevator.Recognition_Threshold__c) {
                        List<Contact> contactMatches = [SELECT Id, Name, FirstName, Favorite_Sport__c, Favorite_Music__c, Office_Floor__c FROM Contact WHERE LastName='Lego' AND FirstName = :thisRide.Predicted_Rider_1__c];
                        if (contactMatches.size() == 1) {
                            thisRide.Rider__c = contactMatches[0].Id;
                            riderPredicted.Known__c = TRUE;
                            riderPredicted.Name__c = contactMatches[0].FirstName;
                            riderPredicted.Favorite_Music__c = contactMatches[0].Favorite_Music__c;
                            riderPredicted.Favorite_Sport__c = contactMatches[0].Favorite_Sport__c;
                            riderPredicted.Office_Floor__c = contactMatches[0].Office_Floor__c;                        
                        }
                    }
                    
                    update thisRide;
                    EventBus.publish(riderPredicted);
                }
            }
            
            // Create a link between the picture (ContentVersion) and the
        	// new Ride record.
            ContentDocumentLink cdl = new ContentDocumentLink();
            cdl.ContentDocumentId = cdId;
            cdl.LinkedEntityId = thisRide.Id;
            cdl.ShareType = 'V';
            cdl.Visibility = 'AllUsers';
            
            insert cdl;
            
            

        }
    }
    
    
    // Controller function for Lightning components
    @AuraEnabled
    public static void goToFloor (Integer floor) {
        TakeRiderToFloor__e takeRiderToFloorEvent = new TakeRiderToFloor__e();
        
        takeRiderToFloorEvent.Floor__c = floor;
        
        EventBus.publish(takeRiderToFloorEvent);
    }
    
    
    @AuraEnabled
    public static void motionDetected () {
        MotionDetected__e motionDetectedEvent = new MotionDetected__e();
        motionDetectedEvent.DeviceId__c = 'ELEVATOR-001';
        
        EventBus.publish(motionDetectedEvent);
    }
    
    
    @AuraEnabled
    public static List<String> getImagesFromRide(Id rideId) {
        System.debug('getImagesFromRide with rideId ' + rideId);
        Ride__c ride = [SELECT Id, Predicted_Rider_1__c, Predicted_Rider_2__c, Predicted_Rider_3__c FROM Ride__c WHERE Id= :rideId][0];
        List<String> returnStrings = new List<String>();
        
        // Get the Id of the attached image.
        Id cdId = [SELECT Id, ContentDocumentId FROM ContentDocumentLink WHERE LinkedEntityId=:rideId][0].ContentDocumentId;
        List<ContentVersion> cv = [SELECT Id FROM ContentVersion WHERE ContentDocumentId =:cdId];
        if (cv.size()>0) {
            returnStrings.add(cv.get(0).Id);
        }
        
        // Find the first Contact and get the picture Id.
        List<Contact> predictedRider = [SELECT Id, Name FROM Contact WHERE FirstName=:ride.Predicted_Rider_1__c AND LastName='Lego'];
        if (predictedRider.size()>0) {
            Id predictedRiderId = predictedRider[0].Id;
            cdId = [SELECT Id, ContentDocumentId FROM ContentDocumentLink WHERE LinkedEntityId=:predictedRiderId].ContentDocumentId;
            cv = [SELECT Id FROM ContentVersion WHERE ContentDocumentId =:cdId];
            if (cv.size()>0) {
                returnStrings.add(cv.get(0).Id);
            }            
        }
        predictedRider = [SELECT Id, Name FROM Contact WHERE FirstName=:ride.Predicted_Rider_2__c AND LastName='Lego'];
        if (predictedRider.size()>0) {
            Id predictedRiderId = predictedRider[0].Id;
            cdId = [SELECT Id, ContentDocumentId FROM ContentDocumentLink WHERE LinkedEntityId=:predictedRiderId].ContentDocumentId;
            cv = [SELECT Id FROM ContentVersion WHERE ContentDocumentId =:cdId];
            if (cv.size()>0) {
                returnStrings.add(cv.get(0).Id);
            }            
        }
        predictedRider = [SELECT Id, Name FROM Contact WHERE FirstName=:ride.Predicted_Rider_3__c AND LastName='Lego'];
        if (predictedRider.size()>0) {
            Id predictedRiderId = predictedRider[0].Id;
            cdId = [SELECT Id, ContentDocumentId FROM ContentDocumentLink WHERE LinkedEntityId=:predictedRiderId].ContentDocumentId;
            cv = [SELECT Id FROM ContentVersion WHERE ContentDocumentId =:cdId];
            if (cv.size()>0) {
                returnStrings.add(cv.get(0).Id);
            }            
        }
        return returnStrings;
    }
    
    @AuraEnabled
    public static List<LegoPrediction> getPredictionsFromRide(Id rideId) {
        System.debug('getPredictionsFromRide with rideId ' + rideId);
        Ride__c ride = [SELECT Id, Predicted_Rider_1__c, Predicted_Rider_2__c, Predicted_Rider_3__c,
                        Confidence_1__c, Confidence_2__c, Confidence_3__c
                        FROM Ride__c WHERE Id= :rideId][0];
        List<LegoPrediction> returnLegoPrediction = new List<LegoPrediction>();
        Id cdId;
        List<ContentVersion> cv;
        
        // Find the first Contact and get the picture Id.
        List<Contact> predictedRider = [SELECT Id, Name FROM Contact WHERE FirstName=:ride.Predicted_Rider_1__c AND LastName='Lego'];
        if (predictedRider.size()>0) {
            Id predictedRiderId = predictedRider[0].Id;
            cdId = [SELECT Id, ContentDocumentId FROM ContentDocumentLink WHERE LinkedEntityId=:predictedRiderId].ContentDocumentId;
            cv = [SELECT Id FROM ContentVersion WHERE ContentDocumentId =:cdId];
            if (cv.size()>0) {
                LegoPrediction prediction = new LegoPrediction(
                    ride.Predicted_Rider_1__c, 
                    ride.Confidence_1__c.setScale(2, RoundingMode.HALF_UP),
                    cv.get(0).Id);
                returnLegoPrediction.add(prediction);
            }            
        }
        predictedRider = [SELECT Id, Name FROM Contact WHERE FirstName=:ride.Predicted_Rider_2__c AND LastName='Lego'];
        if (predictedRider.size()>0) {
            Id predictedRiderId = predictedRider[0].Id;
            cdId = [SELECT Id, ContentDocumentId FROM ContentDocumentLink WHERE LinkedEntityId=:predictedRiderId].ContentDocumentId;
            cv = [SELECT Id FROM ContentVersion WHERE ContentDocumentId =:cdId];
            if (cv.size()>0) {
                LegoPrediction prediction = new LegoPrediction(
                    ride.Predicted_Rider_2__c, 
                    ride.Confidence_2__c.setScale(2, RoundingMode.HALF_UP),
                    cv.get(0).Id);
                returnLegoPrediction.add(prediction);
            }            
        }
        predictedRider = [SELECT Id, Name FROM Contact WHERE FirstName=:ride.Predicted_Rider_3__c AND LastName='Lego'];
        if (predictedRider.size()>0) {
            Id predictedRiderId = predictedRider[0].Id;
            cdId = [SELECT Id, ContentDocumentId FROM ContentDocumentLink WHERE LinkedEntityId=:predictedRiderId].ContentDocumentId;
            cv = [SELECT Id FROM ContentVersion WHERE ContentDocumentId =:cdId];
            if (cv.size()>0) {
                LegoPrediction prediction = new LegoPrediction(
                    ride.Predicted_Rider_3__c, 
                    ride.Confidence_3__c.setScale(2, RoundingMode.HALF_UP),
                    cv.get(0).Id);
                returnLegoPrediction.add(prediction);
            }            
        }
        return returnLegoPrediction;
    }

    @AuraEnabled
    public static String getSessionId() {
        return UserInfo.getSessionId();
    }
    
}