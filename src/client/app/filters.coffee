define ['../bower_components/angular/angular','moment'], (angular, moment) ->

  angular.module 'SocialUp.filters', []

  .filter 'formatNumber', [ ->
    return (number, decimals) ->

      number = parseFloat(number)
      if(isNaN(number))
        return '-'
      if(number<1000)
        return number
      else
        numberInKilos = number/1000;
        if numberInKilos<1000
          return formatValue(numberInKilos)+'k'
        else
          numberInMillions = numberInKilos/1000
          if numberInMillions<1000
            return formatValue(numberInMillions)+'M'
          else
          return formatValue(numberInMillions/1000)+' Md'

      formatValue = (value) ->
        if not decimals
          return parseInt(value)
        else
          return value.toFixed(decimals)
  ]

  .filter 'formatFileSize', [ ->

    return (sizeInBytes) ->
      sizeInKiloBytes = sizeInBytes/1024
      if sizeInKiloBytes<1
        return sizeInBytes+" o"
      else
      sizeInMegaBytes = sizeInKiloBytes/1024
      if sizeInMegaBytes<1
        return Number(sizeInKiloBytes).toFixed(2)+" ko"
      else
      sizeInGigaBytes = sizeInMegaBytes/1024
      return Number(sizeInMegaBytes).toFixed(2) + (sizeInGigaBytes<1 ? " Mo": " Go")
  ]

  .filter 'formatDurationInSeconds', [ ->

    return (durationInSeconds) ->
      format = if durationInSeconds>=3600 then "HH[h]mm:ss" else "mm:ss"
      return moment(durationInSeconds*1000).format(format)
  ]

  .filter 'formatDate', [ ->

    return (date) ->
      time = Date.now() - new Date(date).getTime()
      return moment.duration(time).humanize()
  ]
