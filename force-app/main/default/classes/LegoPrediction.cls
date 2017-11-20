global class LegoPrediction {
    @AuraEnabled
    global String name;
    @AuraEnabled
    global Decimal likelihood;
    @AuraEnabled
    global Id imageId;

    global LegoPrediction(String name, Decimal likelihood, Id imageId) {
        this.name = name;
        this.likelihood = likelihood;
        this.imageId = imageId;
    }
}