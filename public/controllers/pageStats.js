define(['./module', 'moment'], function(appModule, moment) {
    
    'use strict';
        
    appModule.controller('PageStatsController', ['$scope', '$rootScope', '$location', 'statsService', 'alertsService', 
    function($scope, $rootScope, $location, statsService, alertsService) {
        
        $scope.pageStats = {
            providers : [{
                    value : 'google' , title : 'youtube', pageType : 'chaîne'
                }, {
                    value : 'facebook' , title : 'facebook', pageType : 'page'
                }]
        };
                
        $scope.pages = [];
        $scope.displayedCollection = [].concat($scope.pages);
        $scope.itemsByPage = 10;

        $scope.searchPage = function() {
            $scope.isPagesLoading=true;
            statsService.getPages($scope.pageStats.provider.value, $scope.pageName).then(function(pages){
                $scope.isPagesLoading=false;
                $scope.pages=pages;
                $scope.displayedCollection = [].concat($scope.pages);
            }, function(err) {
                console.error(err);
                $scope.isPagesLoading=false;
                alertsService.error("Impossible de chercher des pages Facebook: "+err);
            });
        };
        
        //select a page
        $scope.setSelected = function(page) {
            $scope.selectedPage = page;
        };
        
        $scope.isPagesLoading = false;
        $scope.isStatsLoading = false;
    
        $scope.stats = {
            dates : {}
        };
        $scope.metricTypes = [
            {value:"page_fans_country", label:"Nombre de likes total, par jour"},
            {value:"page_fans_country", label:"Variation des likes, par jour", isVariation : true}, 
            {value:"page_storytellers_by_country", label:"Interactions journalières"}
        ];
        
        $scope.getPageStats = function() {
                    
            var dateSince = $scope.stats.dates.since;
            var dateUntil = $scope.stats.dates.until;
            
            if(!dateSince || !dateUntil) {
                alertsService.warn("Veuillez choisir une date de début ET une date de fin svp");
                return;
            }
            if(!$scope.stats.metricType) {
                 alertsService.warn("Veuillez choisir un type de stats à afficher svp");
                return;
            }
            
            $scope.isStatsLoading=true;
            
            //adapt tootip label on the graph according to selected stat type
            if($scope.stats.metricType.value === 'page_fans_country') {
                if($scope.stats.metricType.isVariation)
                    $scope.chartOptions.tooltipTemplate = "<%if (label){%><%=label%> : <%}%><%if(value>0){%>+<%}%><%=value%> likes";
                else
                    $scope.chartOptions.tooltipTemplate = $scope.tooltipTemplate+" likes";
            } else
                 $scope.chartOptions.tooltipTemplate = $scope.tooltipTemplate+" interactions";
            
            //add 1 day to "dateUntil parameter" because facebook exclude it
            dateUntil = moment(dateUntil).add(1,'days');

            statsService.getPageMetrics($scope.pageStats.provider.value, $scope.stats.metricType.value, $scope.selectedPage.id, dateSince.getTime()/1000, dateUntil.unix()).then(function(metrics){
               
                //console.log("metrics: ", metrics);
                var valuesByDay = metrics[0].values; //end_time, value{}
                $scope.labels=[];
                $scope.series = [$scope.stats.metricType];
                $scope.data = [[]];
                
                var previousValue;
                
                //aggregate all countries values
                valuesByDay.forEach(function(dayValue) {
    
                    if(!$scope.stats.metricType.isVariation || ($scope.stats.metricType.isVariation && previousValue) )                   
                        $scope.labels.push(moment(dayValue.end_time).format('D MMM YY'));                 
                    var likes = 0;
                    for(var country in dayValue.value){
                        likes+=dayValue.value[country];
                    }                    
                    if($scope.stats.metricType.isVariation) {
                        if(!previousValue) {
                            previousValue = likes;
                        } else {
                            var variation = likes - previousValue;
                            $scope.data[0].push(variation);
                            previousValue = likes;
                        }
                    } else {
                        $scope.data[0].push(likes);
                    }
                });
                $scope.isStatsLoading=false;
                //console.log("$scope.data: ", $scope.data);
            }, function(err) {
                console.error(err);
                $scope.isStatsLoading=false;
                alertsService.error("Impossible de récupérer les stats Facebook: "+err);
            });
        };
        
        $scope.format = 'dd MMMM yyyy';
        $scope.status = {
            since : false,
            until: false
        };
        
        //3 jours d'écart pour les stats FB
        $scope.maxDate = moment().subtract(3,'days').hours(0).minutes(0).seconds(0);
        
        $scope.open = function(type, $event) {
            $event.preventDefault();
            $event.stopPropagation();
            $scope.status[type] = true;
        };
        
        //TODO : cut by periods of 93 days if request duration is too long
        $scope.changeDate = function(type) {
            // There cannot be more than 93 days (8035200 s) between since and from => 92 days (8035200-86400=7948800) because we add one
            var since = $scope.stats.dates.since;
            var until = $scope.stats.dates.until;
            if(since && until) {
                since = since.getTime()/1000;
                until = until.getTime()/1000;
                if( (until-since)<=0 ) {
                    alertsService.warn("Veuillez choisir une date de début antérieure à celle de fin");
                    delete $scope.stats.dates[type];
                    return;
                } else if((until-since)>7948800) {
                    alertsService.warn("Vous ne pouvez choisir plus de 92 jours d'écart entre la date de début et celle de fin");
                    delete $scope.stats.dates[type];
                    return;
                }
            }
            $scope.status[type] = false;
        };

        //disable future dates
        $scope.disabled = function(date) {
            return date.getTime() > Date.now();
        };

        //chart
        $scope.tooltipTemplate = "<%if (label){%><%=label%> : <%}%><%=value%>";
        $scope.chartOptions = {
            //Number - Amount of animation steps
            animationSteps : 100,
            //String - Animation easing effect
            animationEasing : "easeOutBounce",
            //Boolean - Whether we animate the rotation of the Doughnut
            animateRotate : true,
            //Boolean - Whether we animate scaling the Doughnut from the centre
            animateScale : true,
            tooltipTemplate: $scope.tooltipTemplate
        };
               
    }]);
    
});