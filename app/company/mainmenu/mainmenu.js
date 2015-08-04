(function(){
    'use strict';

    angular.module('app').controller('mainMenuCtrl', ['$scope', '$mdSidenav', 'CompanySvc', '$location', '$timeout', function($scope, $mdSidenav, CompanySvc, $location, $timeout){
        if (!CompanySvc.userInfo.fname) $location.url('/'); // Return to Login if invalid user

        var me = this;
        me.menu = [];
        me.tabs = [];
        me.menuOpen = true;
        me.selectedIndex = 0;
        me.fname = CompanySvc.userInfo.fname; // Display User Name

        createMenu(CompanySvc.ofGetMenu()); // Get & Set Menu Array

        function createMenu (pMenu) {
            var mMmindex = 0;
            var mPrevGroup = '';

            for (var i in pMenu){
                // Create group
                if (mPrevGroup !== pMenu[i].groupname) {
                    mMmindex++; // Increment when new group
                    me.menu.push({"groupname" : pMenu[i].groupname, "index" : mMmindex, "submenu" : [] });
                }
                // Create sub group
                me.menu[mMmindex - 1].submenu.push({"path" : 'app/' + pMenu[i].fwindow + '/' + pMenu[i].id + '.html',"index" : mMmindex, "prog" : pMenu[i].text});
                mPrevGroup = pMenu[i].groupname;
            }
        }

        $scope.addTab = function (submenu) {
            // If found select it
            for (var j = 0; j < me.tabs.length; j++) {
                if (submenu.prog == me.tabs[j].title) {
                    me.selectedIndex = j;
                    return;
                }
            }

            me.tabs.push({ title: submenu.prog, content: submenu.path, active: true});
            //me.selectedIndex = me.tabs.length - 1;
            $timeout(function() {me.selectedIndex = me.tabs.length - 1;}, 500); // This allows new tab load its content
        };

        $scope.removeTab = function (tab) {
            for (var j = 0; j < me.tabs.length; j++) {
                if (tab.title == me.tabs[j].title) {
                    me.tabs.splice(j, 1);
                    break;
                }
            }
        };

        // Hide/Show Menu
        this.toggleLeftMenu = function() {
            me.menuOpen = (me.menuOpen) ? false :true;
        };

        // Full Screen
        this.toggleFullScreen = function() {
            if ((document.fullScreenElement && document.fullScreenElement !== null) ||    // alternative standard method
                (!document.mozFullScreen && !document.webkitIsFullScreen)) {               // current working methods
                if (document.documentElement.requestFullScreen) {
                    document.documentElement.requestFullScreen();
                } else if (document.documentElement.mozRequestFullScreen) {
                    document.documentElement.mozRequestFullScreen();
                } else if (document.documentElement.webkitRequestFullScreen) {
                    document.documentElement.webkitRequestFullScreen(Element.ALLOW_KEYBOARD_INPUT);
                }
            } else {
                if (document.cancelFullScreen) {
                    document.cancelFullScreen();
                } else if (document.mozCancelFullScreen) {
                    document.mozCancelFullScreen();
                } else if (document.webkitCancelFullScreen) {
                    document.webkitCancelFullScreen();
                }
            }
        };

        // Expand Menu
        $scope.toggleSelectSection = function(section) {
            $scope.section = section;
        };

        $scope.isSectionSelected = function(section) {
            return $scope.section === section || false;
        };
    }]);

})();