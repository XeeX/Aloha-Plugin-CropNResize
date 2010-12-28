/*!
* Aloha Editor
* Author & Copyright (c) 2010 Gentics Software GmbH
* aloha-sales@gentics.com
* Licensed unter the terms of http://www.aloha-editor.com/license.html
*/
/**
 * Register the CropNResize as GENTICS.Aloha.Plugin
 */
GENTICS.Aloha.CropNResize = new GENTICS.Aloha.Plugin('com.gentics.aloha.plugins.CropNResize');

/**
 * Configure the available languages
 */
GENTICS.Aloha.CropNResize.languages = ['en', 'de'];

/**
 * The image that is currently edited
 */
GENTICS.Aloha.CropNResize.obj = null;

/**
 * The Jcrop API reference
 * this is needed to be able to destroy the cropping frame later on
 * the variable is linked to the api object whilst cropping, or set to null otherwise
 * strange, but done as documented http://deepliquid.com/content/Jcrop_API.html
 */
GENTICS.Aloha.CropNResize.jcAPI = null;

/**
 * this will contain an image's original properties to be able to undo previous settings
 * 
 * when an image is clicked for the first time, a new object will be added to the array
 * {
 * 		obj : [the image object reference],
 * 		src : [the original src url],
 * 		width : [initial width],
 * 		height : [initial height]
 * }
 * 
 * when an image is clicked the second time, the array will be checked for the image object
 * referenct, to prevent for double entries
 */
GENTICS.Aloha.CropNResize.restoreProps = [];

/**
 * resized callback is triggered right after the user finished resizing the image
 * @param image jquery image object 
 */
GENTICS.Aloha.CropNResize.onResized = function (image) {};

/**
 * crop callback is triggered after the user clicked accept to accept his crop
 * @param image jquery image object reference
 * @param props cropping properties
 */
GENTICS.Aloha.CropNResize.onCropped = function (image, props) {};

/**
 * button references
 */
GENTICS.Aloha.CropNResize.cropButton = null;
GENTICS.Aloha.CropNResize.resizeButton = null;

/**
 * Initialize the plugin, register the buttons
 */
GENTICS.Aloha.CropNResize.init = function() {
	var that = this;
	
	// load additional js libs
	jQuery('head').append(
		'<script type="text/javascript" src="http://dev42.office:91/jqueryui/js/jquery-ui-1.8.7.custom.min.js"></script>' + 
		'<link rel="stylesheet" href="http://dev42.office:91/jqueryui/css/ui-lightness/jquery-ui-1.8.7.custom.css" />' + 
		'<script type="text/javascript" src="http://dev42.office:91/Jcrop/js/jquery.Jcrop.js"></script>' + 
		'<link rel="stylesheet" href="http://dev42.office:91/Jcrop/css/jquery.Jcrop.css" />');
	
	// create image scope
	GENTICS.Aloha.FloatingMenu.createScope('GENTICS.Aloha.image', ['GENTICS.Aloha.global']);
	jQuery('img').mouseup(function(e) {
		that.focus(e);
		e.stopPropagation();
	});
	
	// set callbacks
	if (typeof this.settings.onResized == "function") {
		this.onResized = this.settings.onResized;
	}
	if (typeof this.settings.onCropped == "function") {
		this.onCropped = this.settings.onCropped;
	}
	
	/*
	 * resize stuff goes here
	 */
	this.resizeButton = new GENTICS.Aloha.ui.Button({
		'label' : 'Resize',
		'size' : 'small',
		'tooltip' : this.i18n('Resize'),
		'toggle' : true,
		'onclick' : function (btn, event) {
			if (btn.pressed) {
				that.resize();
			} else {
				that.endResize();
			}
		}
	});

	// add to floating menu
	GENTICS.Aloha.FloatingMenu.addButton(
		'GENTICS.Aloha.image',
		this.resizeButton,
		GENTICS.Aloha.i18n(GENTICS.Aloha, 'floatingmenu.tab.image'),
		10
	);
	
	
	/*
	 * image cropping stuff goes here
	 */
	this.cropButton = new GENTICS.Aloha.ui.Button({
		'label' : 'Crop',
		'size' : 'small',
		'tooltip' : this.i18n('Resize'),
		'toggle' : true,
		'onclick' : function (btn, event) {
			if (btn.pressed) {
				that.crop();
			} else {
				that.endCrop();
			}
		}
	});

	// add to floating menu
	GENTICS.Aloha.FloatingMenu.addButton(
		'GENTICS.Aloha.image',
		this.cropButton,
		GENTICS.Aloha.i18n(GENTICS.Aloha, 'floatingmenu.tab.image'),
		20
	);
	
	this.acceptCropButton = new GENTICS.Aloha.ui.Button({
		'label' : 'Accept',
		'size' : 'small',
		'tooltip' : this.i18n('Resize'),
		'toggle' : false,
		'onclick' : function (btn, event) {
			that.acceptCrop();
		},
		'visible' : false
	});

	// add to floating menu
	GENTICS.Aloha.FloatingMenu.addButton(
		'GENTICS.Aloha.image',
		this.acceptCropButton,
		GENTICS.Aloha.i18n(GENTICS.Aloha, 'floatingmenu.tab.image'),
		20
	);
	
	/*
	 * add a reset button
	 */
	GENTICS.Aloha.FloatingMenu.addButton(
		'GENTICS.Aloha.image',
		new GENTICS.Aloha.ui.Button({
			'label' : 'Reset',
			'size' : 'small',
			'tooltip' : this.i18n('Reset'),
			'toggle' : false,
			'onclick' : function (btn, event) {
				that.reset();
			}
		}),
		GENTICS.Aloha.i18n(GENTICS.Aloha, 'floatingmenu.tab.image'),
		30
	);
};

/**
 * resets the image to it's initial properties
 */
GENTICS.Aloha.CropNResize.reset = function () {
	this.endCrop();
	this.endResize();
	for (var i=0;i<this.restoreProps.length;i++) {
		// restore from restoreProps if there is a match
		if (this.obj.get(0) === this.restoreProps[i].obj) {
			this.obj.attr('src', this.restoreProps[i].src);
			this.obj.width(this.restoreProps[i].width);
			this.obj.height(this.restoreProps[i].height);
			return;
		}
	}
}

/**
 * this will be called, when the crop button is pressed, and cropping starts
 */
GENTICS.Aloha.CropNResize.crop = function () {
	var that = this;
	
	this.resizeButton.extButton.toggle(false);
	this.resizeButton.extButton.disable();
	this.acceptCropButton.show();

	// the floating menu won't update properly whithout this
	GENTICS.Aloha.FloatingMenu.doLayout(); 
	GENTICS.Aloha.FloatingMenu.refreshShadow();

	this.jcAPI = jQuery.Jcrop(this.obj, {
		onSelect : function () {
			// ugly hack to keep scope :( 
			setTimeout(function () {
				GENTICS.Aloha.FloatingMenu.setScope('GENTICS.Aloha.image');
			}, 10);
		}
	});
	
};

/**
 * end cropping
 * will toggle buttons accordingly and remove all cropping markup
 */
GENTICS.Aloha.CropNResize.endCrop = function () {
	if (this.jcAPI) {
		this.jcAPI.destroy();
		this.jcAPI = null;
	}
	
	this.cropButton.extButton.toggle(false);
	this.resizeButton.extButton.enable();
	this.acceptCropButton.hide();
	
	// the crop button won't hide properly without this :(
	GENTICS.Aloha.FloatingMenu.doLayout(); 
	GENTICS.Aloha.FloatingMenu.refreshShadow();
};

/**
 * accept the current cropping area and apply the crop
 */
GENTICS.Aloha.CropNResize.acceptCrop = function () {
	/*
	 * this.jcAPI.tellSelect()
Object
h: 218
w: 296
x: 45
x2: 341
y: 36
y2: 254
__proto__: Object
	 */
	this.onCropped(this.obj, this.jcAPI.tellSelect());
	this.endCrop();
};
/**
 * start resizing
 */
GENTICS.Aloha.CropNResize.resize = function () {
	var that = this;
	
	this.cropButton.extButton.toggle(false);
	this.cropButton.extButton.disable();
	
	this.obj.resizable({
		stop : function (event, ui) {
			that.onResized(that.obj);
			that.endResize();
			
			// this is so ugly, but I could'nt figure out how to do it better... 
			setTimeout(function () {
				GENTICS.Aloha.FloatingMenu.setScope('GENTICS.Aloha.image');
				that.done(event);
			}, 10);
		}
	});
};

/**
 * end resizing
 * will toggle buttons accordingly and remove all markup that has been added for cropping
 */
GENTICS.Aloha.CropNResize.endResize = function () {
	this.obj.resizable("destroy");
	
	this.resizeButton.extButton.toggle(false);
	this.cropButton.extButton.enable();
};

/**
 * an image has been clicked
 */
GENTICS.Aloha.CropNResize.focus = function (e) {
	GENTICS.Aloha.FloatingMenu.setScope('GENTICS.Aloha.image');
	this.obj = jQuery(e.srcElement);
	this.restoreProps.push({
		obj : e.srcElement,
		src : this.obj.attr('src'),
		width : this.obj.width(),
		height : this.obj.height()
	});
	this.updateFM();
};

/**
 * this is called when the cropping or resizing process has finished
 */
GENTICS.Aloha.CropNResize.done = function (e) {
	this.updateFM();
};

/**
 * reposition the floating menu
 */
GENTICS.Aloha.CropNResize.updateFM = function () {
	var o = this.obj.offset();
	GENTICS.Aloha.FloatingMenu.floatTo({
		x : o.left,
		y : (o.top - 100)
	});	
}