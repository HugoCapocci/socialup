define(['angular', 'angularResource', 'angularMocks', 'loginController'], function(angular, mocks) {
    
    function authServiceMock() {
        
    }
    
    function alertsServiceMock() {
        
    }
    var $scope, $location;
    
    beforeEach(function() {
        angular.module('SocialUp', [this]);   
    });

    beforeEach(inject(function($controller, _$location_, $rootScope){
        // The injector unwraps the underscores (_) from around the parameter names when matching
        console.log("controller injected : ",$controller);
        $scope = $rootScope.$new();
        $location = _$location_;
        console.log("$location: ",$location);
        //$controller('LoginController', { $scope: $scope, authService : authServiceMock, alertsService :alertsServiceMock });
        
    }));

    describe('$scope.grade', function() {
    
        it('sets the strength to "strong" if the password length is >8 chars', function() {
            var $scope = {};
            //var controller = $controller('LoginController', { $scope: $scope, authService : authServiceMock, alertsService :alertsServiceMock });
            
            /*
            scope.form.password = 'longerthaneightchars';
            $scope.grade();
            expect($scope.strength).toEqual('strong');
            */
    
        });
      
  });
});