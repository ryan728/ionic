
IonicModule

.directive('ionSlideBox', [function() {

  return {
    restrict: 'E',
    controller: '$ionSlideBox',
    transclude: true,
    scope: {},
    template: 
      '<div class="slider-slides" ng-transclude></div>',
    link: function(scope, element, attr) {
      element.addClass('slider');
    }
  };

}])

.directive('ionSlide', [function() {

  return {
    restrict: 'E',
    scope: true,
    controller: '$ionSlide',
    require: ['^ionSlideBox', 'ionSlide'],
    link: function(scope, element, attr, ctrls) {
      var slideBoxCtrl = ctrls[0];
      var slideCtrl = ctrls[1];

      element.addClass('slider-slide');

      slideBoxCtrl.add(slideCtrl);
      scope.$on('$destroy', function() {
        slideBoxCtrl.remove(slideCtrl);
      });

    }
  };

}])

.controller('$ionSlideBox', ['$scope', '$element', SlideBoxController])

.controller('$ionSlide', ['$scope', '$element', SlideController])

;


/*
 * This can be abstracted into a controller that will work for views, tabs, and slidebox.
 */
function SlideBoxController(scope, element) {
  var self = this;
  var slideList = [];
  var selectedIndex = -1;
  var loop = true;
  var slidesEl = angular.element(element[0].querySelector('.slider-slides'));

  self.element = element;
  self.slides = slideList;

  self.selected = selected;
  self.add = add;
  self.remove = remove;
  self.move = move;

  self.previous = previous;
  self.next = next;
  self.isRelevant = isRelevant;

  self.select = select;
  self.changeToNext = ionic.animationFrameThrottle(changeToNext);
  self.changeToPrevious = ionic.animationFrameThrottle(changeToPrevious);

  function selected() {
    return slideList[selectedIndex];
  }

  /*
   * Add/remove/move slides
   */
  function add(slide, index) {
    if (arguments.length === 1) index = slideList.length;

    slideList.splice(index, 0, slide);
    slide.onAdded(slidesEl);

    if (!self.selected()) {
      self.select(index);

    } else if (self.isRelevant(slide)) {
      self.select(selectedIndex);
    }
  }
  function remove(slide) {
    var index = slideList.indexOf(slide);
    if (index < 0) return;

    slideList.splice(index, 1);
    slide.onRemoved();
  }
  function move(slide, toIndex) {
    var currentIndex = slideList.indexOf(slide);
    if (currentIndex < 0) return;

    var isRelevant = self.isRelevant(slide);
    slideList.splice(currentIndex, 1);
    slideList.splice(toIndex, 0, slide);
    if (isRelevant) {
      self.select(slide, true);
    }
  }

  /*
   * Array helpers
   */
  function indexOf(slide) {
    return slideList.indexOf(slide);
  }
  // Get the next slide relative to the given slide
  function next(fromIndex) {
    if (arguments.length === 0) fromIndex = selectedIndex;
    if (fromIndex < 0 || fromIndex >= slideList.length) {
      return -1;
    }

    var nextIndex = fromIndex + 1;
    if (loop && nextIndex === slideList.length) {
      nextIndex -= slideList.length - 1;
    }
    return nextIndex;
  }
  // Get the previous slide relative to the given slide
  // Arbitrarily say we can't have a previous with less than 3 slides.
  // This is because if only 2 slides exist, previous will be the same as next.
  function previous(fromIndex) {
    if (arguments.length === 0) fromIndex = selectedIndex;
    if (fromIndex < 0 || fromIndex >= slideList.length || slideList.length < 3) {
      return -1;
    }

    var previousIndex = fromIndex - 1;
    if (loop && previousIndex === -1) {
     previousIndex += slideList.length - 1;
    }
    return previousIndex;
  }

  // Returns true if the given slide is the selected slide,
  // previous slide, or next slide.
  function isRelevant(slide) {
    return slide === self.selected() ||
        slide === slideList[self.previous()] ||
        slide === slideList[self.next()];
  }


  /*
   * Select/deselect slide
   */
  function select(newIndex) {
    var newSelected = slideList[newIndex];
    if (!newSelected || newIndex < 0 || newIndex >= slideList.length) return;

    var oldSelected = self.selected();
    var oldPrevious = slideList[self.previous(selectedIndex)];
    var oldNext = slideList[self.next(selectedIndex)];

    var newPrevious = slideList[self.previous(newIndex)];
    var newNext = slideList[self.next(newIndex)];

    newSelected.setSelected();
    newPrevious && newPrevious.setPrevious();
    newNext && newNext.setNext();
    slidesEl.css(ionic.CSS.TRANSFORM, '');

    // All of the old slides that are still unchanged and not the same as their new
    // equivalents, detach them.
    // For example, the old previous slide could be the new selected slide.
    if (oldSelected && oldSelected !== newSelected && oldSelected.state === 'selected') {
      oldSelected.setDetached();
    }
    if (oldPrevious && oldPrevious !== newPrevious && oldPrevious.state === 'previous') {
      oldPrevious.setDetached();
    }
    if (oldNext && oldNext !== newNext && oldNext.state === 'next') {
      oldNext.setDetached();
    }

    selectedIndex = newIndex;
  }
  function changeToNext(percent) {
    slidesEl.css(ionic.CSS.TRANSFORM, 'translate3d(' + (-100 * percent) + '%,0,0)');
  }
  function changeToPrevious(percent) {
    slidesEl.css(ionic.CSS.TRANSFORM, 'translate3d(' + (100 * percent) + '%,0,0)');
  }

  // TODO move out into separate dragging class
  var dragStartGesture = ionic.onGesture('dragstart', onDragStart, slidesEl[0]);
  var dragGesture = ionic.onGesture('drag', onDrag, slidesEl[0]);
  var dragEndGesture = ionic.onGesture('dragend', onDragEnd, slidesEl[0]);

  var drag;
  function onDragStart(ev) {
    if (drag) return;
    drag = {
      startX: ev.gesture.center.pageX,
      slidesWidth: slidesEl.prop('offsetWidth')
    };
    slidesEl.addClass('dragging');
  }
  function onDrag(ev) {
    var gesture = ev.gesture;
    if (!drag) return;
    if (!(gesture.direction === 'left' || gesture.direction === 'right')) return;

    var x = gesture.center.pageX;
    var delta = drag.startX - x;
    var percent = delta / drag.slidesWidth;
    slidesEl.css(ionic.CSS.TRANSFORM, 'translate3d(' + (-percent * 100) + '%,0,0)');
  }
  function onDragEnd(ev) {
    if (!drag) return;
    slidesEl.removeClass('dragging');

    var x = ev.gesture.center.pageX;
    var delta = drag.startX - x;

    if (delta > drag.slidesWidth * 0.5) {
      slidesEl.css(ionic.CSS.TRANSFORM, 'translate3d(-100%,0,0)');
      slidesEl.on('transitionend webkitTransitionEnd', onTransitionEnd);
    } else if (delta < -drag.slidesWidth * 0.5) {
      slidesEl.css(ionic.CSS.TRANSFORM, 'translate3d(100%,0,0)');
      slidesEl.on('transitionend webkitTransitionEnd', onTransitionEnd);
    } else {
      slidesEl.css(ionic.CSS.TRANSFORM, '');
    }
    function onTransitionEnd(ev) {
      // Make sure this didn't bubble up from a child
      if (ev.target === slidesEl[0]) {
        self.select( delta < 0 ? self.previous() : self.next() );
        slidesEl.off('transitionend webkitTransitionEnd', onTransitionEnd);
        scope.$apply();

        slidesEl.addClass('dragging');
        ionic.requestAnimationFrame(function() {
          ionic.requestAnimationFrame(function() {
            slidesEl.css(ionic.CSS.TRANSFORM, '');
            slidesEl.removeClass('dragging');
          });
        });
      }
    }

    drag = null;
  }
}

/*
 * This can be abstracted into a controller that will work for tab items, slides, and views.
 */
function SlideController(scope, element) {
  var self = this;

  scope.$on('$destroy', function() {
    element.remove();
  });

  self.onAdded = onAdded;
  self.onRemoved = onRemoved;

  self.state = '';
  self.setDetached = setDetached;
  self.setNext = setNext;
  self.setPrevious = setPrevious;
  self.setSelected = setSelected;

  /*
   * Events
   */
  function onAdded(parentElement) {
    self.parentElement = parentElement;

    // Set default state
    self.setDetached();
  }
  function onRemoved() {
    self.setDetached();
  }

  /*
   * Set State
   */
  function setDetached() {
    element.attr('slide-state', 'detached');
    // Don't use element.remove(), that will destroy element's data as well
    if (element[0].parentNode) {
      element[0].parentNode.removeChild(element[0]);
    }
    ionic.Utils.disconnectScope(scope);

    self.state = 'detached';
  }
  function setPrevious() {
    element.attr('slide-state', 'previous');
    attachSlide();

    self.state = 'previous';
  }
  function setSelected() {
    element.attr('slide-state', 'selected');
    attachSlide();

    self.state = 'selected';
  }
  function setNext() {
    element.attr('slide-state', 'next');
    attachSlide();

    self.state = 'next';
  }

  /*
   * Private methods
   */
  //Attach a slide if it was detached
  function attachSlide() {
    if (self.state === 'detached') {
      self.parentElement.append(element);
      ionic.Utils.reconnectScope(scope);
    }
  }
}
