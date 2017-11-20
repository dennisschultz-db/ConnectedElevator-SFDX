({
    onGetImageUrl: function(component, file, base64Data) {
        console.log('onGetImageUrl');
        var action = component.get("c.getImagesFromRide");
        var rideId = component.get("v.recordId");
        var images = [];
        action.setParams({
            rideId: rideId
        });
        action.setCallback(this, function(a) {
            console.log('callback');
            var state = a.getState();
            if (state === 'ERROR') {
                console.log(a.getError());
                alert("An error has occurred");
            } else {
                if (!a.getReturnValue()=='') {
                    console.log('returned a is ' + a);
                    var Ids = a.getReturnValue();
                    images.push("/sfc/servlet.shepherd/version/download/" + Ids[0]);
                    images.push("/sfc/servlet.shepherd/version/download/" + Ids[1]);
                    images.push("/sfc/servlet.shepherd/version/download/" + Ids[2]);
                    images.push("/sfc/servlet.shepherd/version/download/" + Ids[3]);
                    component.set("v.images", images);
                }
            }
            
        });
        $A.enqueueAction(action);
        
    }
})