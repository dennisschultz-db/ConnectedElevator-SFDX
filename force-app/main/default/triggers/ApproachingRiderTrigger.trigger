trigger ApproachingRiderTrigger on ApproachingRider__e (after insert) {
    
    for (ApproachingRider__e are : Trigger.New) {
      System.debug('ApproachingRider event created with RiderPictureId ' + are.RiderPictureId__c );
        

    }

}