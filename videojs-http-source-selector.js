/**
 * videojs-contrib-quality-levels
 * Original source https://github.com/jfujita/videojs-http-source-selector 1.1.6 by jfujita
 * rewritten to work with videojs ^8.0
 * @author Cemal Gültekin https://github.com/csgultekin
 * for Ozet Akademi https://github.com/OzetAkademi
 * @version 1.1.7
 * @license Apache-2.0
 */
(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory(require('video.js')) :
        typeof define === 'function' && define.amd ? define(['video.js'], factory) :
            (global = global || self, global['videojs-http-source-selector'] = factory(global.videojs));
}(this, function (videojs) {

    var MenuButton = videojs.getComponent("MenuButton");
    var MenuItem = videojs.getComponent("MenuItem");

    var version = "1.1.7";

    class SourceMenuItem extends MenuItem {

        constructor(player, options) {
            //options.multiSelectable = false;
            super(player, options);
            //this.options_.multiSelectable = false;
        }
        

        handleClick(event) {
            var childNodes = this.el_.parentNode.children;
            
            var selected = this.options_;
            var levels = this.player().qualityLevels();
            //videojs does not remove the selected class from previously selected elements
            for (var j = 0; j < childNodes.length; j++) {
                childNodes[j].classList.remove("vjs-selected");
            }

            for (var i = 0; i < levels.length; i++) {
                levels[i].enabled_(false);
                if (selected.index == levels.length) {
                    // If this is the Auto option, enable all renditions for adaptive selection
                    levels[i].enabled_(true);
                } else if (selected.index == i) {
                    levels[i].enabled_(true);
                }
            }
            super.handleClick(event);
        }
        

        buildCSSClass() {
            return `vjs-chapters-button ${super.buildCSSClass()}`; //Add an icon to your menu
        }
    }

    class SourceMenuButton extends MenuButton {

        createEl() {
            return videojs.dom.createEl('div', {
                className: 'vjs-http-source-selector vjs-menu-button vjs-menu-button-popup vjs-control vjs-button'
            });
        }

        buildCSSClass() {
            return MenuButton.prototype.buildCSSClass.call(this) + ' vjs-icon-cog';
        }

        update = function update() {
            return MenuButton.prototype.update.call(this);
        }

        createItems() {

            this.options_.selectable = true;
            this.options_.multiSelectable = false;

            var qualityLevels = this.player().qualityLevels(); // Handle options: We accept an options.default value of ( high || low )
            // This determines a bias to set initial resolution selection.

            if (this.options_ && this.options_["default"]) {
                if (this.options_["default"] == 'low') {
                    for (var i = 0; i < qualityLevels.length; i++) {
                        qualityLevels[i].enabled = i == 0;
                    }
                } else if (this.options_["default"] = 'high') {
                    for (var i = 0; i < qualityLevels.length; i++) {
                        qualityLevels[i].enabled = i == qualityLevels.length - 1;
                    }
                }
            }


            var menuItems = [];
            var levels = this.player().qualityLevels();
            var labels = [];

            for (var i = 0; i < levels.length; i++) {
                var index = levels.length - (i + 1);
                var selected = index === levels.selectedIndex; // Display height if height metadata is provided with the stream, else use bitrate

                var label = "" + index;
                var sortVal = index;

                if (levels[index].height) {
                    label = levels[index].height + "p";
                    sortVal = parseInt(levels[index].height, 10);
                } else if (levels[index].bitrate) {
                    label = Math.floor(levels[index].bitrate / 1e3) + " kbps";
                    sortVal = parseInt(levels[index].bitrate, 10);
                } // Skip duplicate labels


                if (labels.indexOf(label) >= 0) {
                    continue;
                }

                labels.push(label);
                menuItems.push(new SourceMenuItem(this.player_, {
                    label: label,
                    index: index,
                    selected: selected,
                    sortVal: sortVal,
                    selectable: true,
                    multiSelectable: false
                }));
            } // If there are multiple quality levels, offer an 'auto' option


            if (levels.length > 1) {
                menuItems.push(new SourceMenuItem(this.player_, {
                    label: 'Auto',
                    index: levels.length,
                    selected: false,
                    sortVal: 99999,
                    selectable: true,
                    multiSelectable: false
                }));
            } // Sort menu items by their label name with Auto always first


            menuItems.sort(function (a, b) {
                if (a.options_.sortVal < b.options_.sortVal) {
                    return 1;
                } else if (a.options_.sortVal > b.options_.sortVal) {
                    return -1;
                } else {
                    return 0;
                }
            });
            return menuItems;
        }
    }



    var defaults = {}; // Cross-compatibility for Video.js 5 and 6.

    var registerPlugin = videojs.registerPlugin || videojs.plugin; // const dom = videojs.dom || videojs;

    /**
    * Function to invoke when the player is ready.
    *
    * This is a great place for your plugin to initialize itself. When this
    * function is called, the player will have its DOM and child components
    * in place.
    *
    * @function onPlayerReady
    * @param    {Player} player
    *           A Video.js player object.
    *
    * @param    {Object} [options={}]
    *           A plain object containing options for the plugin.
    */

    var onPlayerReady = function onPlayerReady(player, options) {
        player.addClass('vjs-http-source-selector');
        videojs.log("videojs-http-source-selector initialized!");
        videojs.log("player.techName_:" + player.techName_); //This plugin only supports level selection for HLS playback

        if (player.techName_ != 'Html5') {
            return false;
        }
        /**
        *
        * We have to wait for the manifest to load before we can scan renditions for resolutions/bitrates to populate selections
        *
        **/


        player.on(['loadedmetadata'], function (e) {
            var qualityLevels = player.qualityLevels();
            videojs.log('loadmetadata event'); // hack for plugin idempodency... prevents duplicate menubuttons from being inserted into the player if multiple player.httpSourceSelector() functions called.

            if (player.videojs_http_source_selector_initialized == 'undefined' || player.videojs_http_source_selector_initialized == true) {
                videojs.log("player.videojs_http_source_selector_initialized == true");
            } else {
                videojs.log("player.videojs_http_source_selector_initialized == false");
                player.videojs_http_source_selector_initialized = true;
                var controlBar = player.controlBar,
                    fullscreenToggle = controlBar.getChild('fullscreenToggle').el();

                controlBar.addChild('SourceMenuButton', {});
            }
        });
    };
    /**
    * A video.js plugin.
    *
    * In the plugin function, the value of `this` is a video.js `Player`
    * instance. You cannot rely on the player being in a "ready" state here,
    * depending on how the plugin is invoked. This may or may not be important
    * to you; if not, remove the wait for "ready"!
    *
    * @function httpSourceSelector
    * @param    {Object} [options={}]
    *           An object of options left to the plugin author to define.
    */

    var httpSourceSelector = function httpSourceSelector(options) {
        var _this = this;

        this.ready(function () {
            onPlayerReady(_this, videojs.mergeOptions(defaults, options));
        });
        videojs.registerComponent('SourceMenuButton', SourceMenuButton);
        videojs.registerComponent('SourceMenuItem', SourceMenuItem);
    }; // Register the plugin with video.js.


    registerPlugin('httpSourceSelector', httpSourceSelector); // Include the version number.

    httpSourceSelector.VERSION = version;

    return httpSourceSelector;

}));
