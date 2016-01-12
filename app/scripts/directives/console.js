"use strict";

angular.module("homeuiApp")
  .value("scrollTimeoutMs", 100)

  .directive("console", function (mqttClient, $rootScope, $timeout,
                                  dateFilter, getTime, scrollTimeoutMs) {
    mqttClient.addStickySubscription(
      "/wbrules/log/+", function (options) {
        $rootScope.$broadcast(
          "wbrulesLog",
          options.topic.replace(/^.*\//, ""),
          options.payload);
      });

    $rootScope.ruleDebug = {
      enabled: false,
      localEnabled: false
    };

    $rootScope.$watch("ruleDebug.enabled", function (newValue) {
      if (!!newValue !== $rootScope.ruleDebug.localEnabled) {
        mqttClient.send(
          "/devices/wbrules/controls/Rule debugging/on",
          newValue ? "1" : "0", false, 1);
        $rootScope.ruleDebug.localEnabled = !!newValue;
      }
    });

    mqttClient.addStickySubscription(
      "/devices/wbrules/controls/Rule debugging", function (options) {
        $rootScope.ruleDebug.enabled = $rootScope.ruleDebug.localEnabled = options.payload == "1";
      });

    return {
      restrict: "EA",
      replace: true,
      scope: true,
      templateUrl: "scripts/directives/console.html",
      link: function (scope, element, attrs) {
        var scrollTimeout = null,
            messageContainer = element.find(".console-messages");
        scope.$on("wbrulesLog", function (event, level, message) {
          var msgEl = $("<div class='console-message'></div>")
                .addClass("console-message-level-" + level),
              ts = getTime();
          $("<span class='console-message-ts'></span>")
            .text(dateFilter(ts, "yyyy-MM-dd HH:mm:ss"))
            .appendTo(msgEl);
          var textEl = $("<span class='console-message-text'></span>")
            .text(message)
            .appendTo(msgEl);
          textEl.html(textEl.html().replace(/\n/g, "<br>"));
          msgEl.appendTo(messageContainer);
          if (scrollTimeout !== null)
            $timeout.cancel(scrollTimeout);
          scrollTimeout = $timeout(function () {
            scrollTimeout = null;
            var scrollHeight = messageContainer.prop("scrollHeight"),
                elementHeight = messageContainer.height();
            if (elementHeight < scrollHeight)
              messageContainer.scrollTop(scrollHeight);
          }, scrollTimeoutMs);
        });
      }
    };
  });
