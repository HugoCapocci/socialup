define(['./module'], function(appModule) {
  var alertsService;
  alertsService = function($rootScope, $timeout) {
    var createAlert, deleteAlert, getIndex;
    if ($rootScope.alerts == null) {
      $rootScope.alerts = [];
    }
    this.success = function(message, delay) {
      return createAlert(message, 'success', delay);
    };
    this.error = function(message, delay) {
      return createAlert(message, 'danger', delay);
    };
    this.info = function(message, delay) {
      return createAlert(message, 'info', delay);
    };
    this.warn = function(message, delay) {
      return createAlert(message, 'warning', delay);
    };
    createAlert = function(message, type, delay) {
      var alert, index;
      if (delay == null) {
        delay = 2000;
      }
      alert = {
        msg: message,
        type: type,
        opacity: 1
      };
      index = getIndex(alert);
      if (index === -1) {
        $rootScope.alerts.push(alert);
      } else {
        $rootScope.alerts[index].opacity = 1;
      }
      return $timeout(function() {
        return deleteAlert(alert);
      }, delay);
    };
    deleteAlert = function(alert) {
      var index, ref;
      index = getIndex(alert);
      if (index === -1) {
        return;
      }
      if (((ref = $rootScope.alerts) != null ? ref[index] : void 0) != null) {
        if ($rootScope.alerts[index].opacity < 0.1) {
          $rootScope.alerts.splice(index, 1);
        }
      } else {
        $rootScope.alerts[index].opacity = 0.9 * $rootScope.alerts[index].opacity;
      }
      return $timeout(function() {
        return deleteAlert(alert);
      }, 100);
    };
    getIndex = function(alert) {
      var i, index, j, len, myAlert, ref, ref1;
      if (!(((ref = $rootScope.alerts) != null ? ref.length : void 0) > 0)) {
        return -1;
      }
      index = -1;
      ref1 = $rootScope.alerts;
      for (i = j = 0, len = ref1.length; j < len; i = ++j) {
        myAlert = ref1[i];
        if (myAlert.msg === alert.msg && myAlert.type === alert.type) {
          index = i;
          continue;
        }
      }
      return index;
    };
  };
  return appModule.service('alertsService', ['$rootScope', '$timeout', alertsService]);
});
