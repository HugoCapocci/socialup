define(['angular', 'moment'], function(angular, moment) {
  return angular.module('SocialUp.filters', []).filter('formatNumber', [
    function() {
      return function(number, decimals) {
        var formatValue, numberInKilos, numberInMillions;
        formatValue = function(value) {
          if (!decimals) {
            return parseInt(value);
          } else {
            return value.toFixed(decimals);
          }
        };
        number = parseFloat(number);
        if (isNaN(number)) {
          return '-';
        }
        if (number < 1000) {
          return number;
        } else {
          numberInKilos = number / 1000;
          if (numberInKilos < 1000) {
            return formatValue(numberInKilos) + 'k';
          } else {
            numberInMillions = numberInKilos / 1000;
            if (numberInMillions < 1000) {
              return formatValue(numberInMillions) + 'M';
            } else {
              return formatValue(numberInMillions / 1000) + ' Md';
            }
          }
        }
      };
    }
  ]).filter('formatFileSize', [
    function() {
      return function(sizeInBytes) {
        var ref, sizeInGigaBytes, sizeInKiloBytes, sizeInMegaBytes;
        sizeInKiloBytes = sizeInBytes / 1024;
        if (sizeInKiloBytes < 1) {
          return sizeInBytes + " o";
        } else {

        }
        sizeInMegaBytes = sizeInKiloBytes / 1024;
        if (sizeInMegaBytes < 1) {
          return Number(sizeInKiloBytes).toFixed(2) + " ko";
        } else {

        }
        sizeInGigaBytes = sizeInMegaBytes / 1024;
        return Number(sizeInMegaBytes).toFixed(2) + ((ref = sizeInGigaBytes < 1) != null ? ref : {
          " Mo": " Go"
        });
      };
    }
  ]).filter('formatDurationInSeconds', [
    function() {
      return function(durationInSeconds) {
        var format;
        format = durationInSeconds >= 3600 ? "HH[h]mm:ss" : "mm:ss";
        return moment(durationInSeconds * 1000).format(format);
      };
    }
  ]).filter('formatDate', [
    function() {
      return function(date) {
        var time;
        time = Date.now() - new Date(date).getTime();
        return moment.duration(time).humanize();
      };
    }
  ]);
});
