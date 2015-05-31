(function() {
    'use strict';
    define(['lodash', 'numeral', 'helpers/volume-helpers', 'helpers/mock-data-provider-helpers'], function(_, numeral, VolumeHelpers, MockDataProviderHelpers) {
        var VolumeController = function($scope, $q, $location, $interval, ClusterService, VolumeService) {
            ClusterService.getList().then(function(clusters) {
                if(clusters.length === 0) {
                    $location.path('/first');
                }
            });

            var self = this;
            self.reloading = false;
            self.list = [];

            var timer = $interval(reloadData, 5000);
            $scope.$on('$destroy', function() {
                $interval.cancel(timer);
            });
            reloadData();

            function reloadData() {
                if(self.reloading) {
                    return;
                }
                self.reloading = true;
                VolumeService.getList().then(function(volumes) {
                     var tempVolumes = [];
                     _.each(volumes, function(volume) {
                        var mockVolume = MockDataProviderHelpers.getMockVolume(volume.volume_name);
                        var tempVolume = {
                            volume_id : volume.volume_id,
                            cluster : volume.cluster,
                            volume_name : volume.volume_name,
                            volume_type : volume.volume_type,
                            replica_count : volume.replica_count,
                            stripe_count : volume.stripe_count,
                            volume_status : volume.volume_status,
                            cluster_name : volume.cluster_name,
                            description : mockVolume.description,
                            alerts : mockVolume.alerts,
                            areaSpline_cols : [{ id:1, name: 'Used', color: '#39a5dc', type: 'area-spline' }],
                            areaSpline_values : mockVolume.areaSpline_values
                        };
                        tempVolumes.push(tempVolume);
                    });
                    
                    var requests = [];
                    _.each(tempVolumes, function(volume) {
                        requests.push(VolumeService.getCapacity(volume.volume_id));
                    });
                    $q.all(requests).then(function(capacityList) {
                        var index = 0;
                        _.each(capacityList, function(capacity) {
                            tempVolumes[index].capacity = capacity;
                            tempVolumes[index].capacity.freeFormatted = self.formatSize(capacity.free);
                            tempVolumes[index].capacity.totalFormatted = self.formatSize(capacity.total);
                            tempVolumes[index].data_used = isNaN(Math.round(100 - (capacity.free)*(100/capacity.total)))? 0 : Math.round(100 - (capacity.free)*(100/capacity.total));
                            index++;
                        });
                        self.list = tempVolumes;
                        self.reloading = false;
                    });
                    if(self.list.length === 0) {
                        self.list = tempVolumes;
                    }
                });
            };

            this.formatSize = function(size) {
                return numeral(size).format('0.0 b');
            };

            this.getVolumeType = function(id) {
                return VolumeHelpers.getVolumeType(id).type;
            };

            this.getVolumeState = function(id) {
                return VolumeHelpers.getVolumeState(id).state;
            };

            this.create = function() {
                $location.path('/volumes/new');
            };

            this.expand = function(volume_id) {
                $location.path('/volumes/expand/'+volume_id);
            };

            this.isDeleteAvailable = function() {
                return false;
            };
        };
        return ['$scope', '$q', '$location', '$interval', 'ClusterService', 'VolumeService', VolumeController];
    });
})();
