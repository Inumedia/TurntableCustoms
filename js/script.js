var customAvatars = {
	/// Here, we return the appropriate avatar for the user
	/// If we don't have a custom avatar, we return the regular avatar that they selected
	/// otherwise, we return their custom avatar.
	laptopUrls: {
		laptop_mac: "https://s3.amazonaws.com/static.turntable.fm/roommanager_assets/props/laptop_mac_11.png",
		laptop_pc: "https://s3.amazonaws.com/static.turntable.fm/roommanager_assets/props/laptop_windows_11.png",
		laptop_linux: "https://s3.amazonaws.com/static.turntable.fm/roommanager_assets/props/laptop_linux_11.png",
		laptop_ubuntu: "https://s3.amazonaws.com/static.turntable.fm/roommanager_assets/props/laptop_ubuntu_11.png",
		laptop_chrome: "https://s3.amazonaws.com/static.turntable.fm/roommanager_assets/props/laptop_chrome_11.png",
		laptop_iphone: "https://s3.amazonaws.com/static.turntable.fm/roommanager_assets/props/laptop_iphone.png",
		laptop_cake: "https://s3.amazonaws.com/static.turntable.fm/roommanager_assets/props/cake.png",
		laptop_intel: "https://s3.amazonaws.com/static.turntable.fm/roommanager_assets/props/laptop_intel.png",
		laptop_android: "https://s3.amazonaws.com/static.turntable.fm/roommanager_assets/props/laptop_android.png"
	},
	isTC: false,
	doneLoading: true,
	deferredLoading: null,
	DOMwaitingForLock: false,
	onPostLoading: [],
	gotDatabase: false,
	doneLoadingDatabase: true,
	errorLoadingDatabase: false,
	additionalProperties: {},
	roomControl: null,
	roomViewName: null,
	roomView: null,
	deferredControls: null,
	deferredDatabase: null,
	bootStrapped: null,
	initialized: false,
	spotlightParticles: [],
	loadLayout: null,
	setupProfileOverlay: null,
	oldDraw: null,
	GetAvatar: (function(pUser){
			var pId = pUser.userid;
			
			if(!avatars[pId])
				return pUser.avatarid;
			return pId;
	}),
	log: function(){
		//if(!DEBUG_MODE) return;
		console.log.apply(console, arguments);
	},
	PostLoading: function(enQueue){
		if(enQueue !== undefined){
			this.onPostLoading.push(enQueue);
		}else{
			for(var i = 0; i < this.onPostLoading.length; ++i)
				this.onPostLoading[i](this);
		}
	},
	GetProperty: function(userId, propertyName){
		if(customAvatars.additionalProperties[userId] && customAvatars.additionalProperties[userId][propertyName])
			return customAvatars.additionalProperties[userId][propertyName];
	},
	/// This is what we call to fetch the remote database from our servers so that we can keep a current list of who has custom avatars.
	GetDatabase: function(){
		customAvatars.log("Getting Database");
		var that = this;
		return customAvatars.deferredDatabase = $.get("http://turntablecustoms.com/mods/customavatardatabaseUpdate2.php?v="+Date.now(), function(pData){
			that.gotDatabase = true;
			that.log("Got Database");
			that.LoadDatabase(JSON.parse(pData));
		}).error(function(a,b,c,d,e){
			console.log("Error: ", a,b,c,d,e);
			errorLoadingDatabase = true;
		});
	},
	/// This is what we call to load the initial database into TurnTable's memory
	LoadDatabase: function(database){
		customAvatars.log("Loading Database");
		for(var i = 0; i < database.length; ++i){
			var customAvatar = database[i];
			var sClone = undefined;
			if(customAvatar.baseid){
				sClone = $.extend(true, {}, avatars[customAvatar.baseid]);
				if(customAvatar.scale && sClone)
					sClone.customScaleAt = customAvatar.scale;
			}
			if(customAvatar.processing)
				sClone = $.extend(true, sClone == undefined ? {} : sClone, customAvatar.processing);
			var userid = customAvatar.userid;
			if(customAvatar.laptop && !(customAvatars.laptopUrls === undefined))
				customAvatars.laptopUrls['laptop_' + customAvatar.laptop] = 'http://turntablecustoms.com/facesimg/laptops/' + customAvatar.laptop;
			delete customAvatar["baseid"];
			delete customAvatar["scale"];
			delete customAvatar["processing"];
			delete customAvatar["userid"];

			if(Object.keys(customAvatar).length != 0){
				if(customAvatars.additionalProperties[userid])
					customAvatars.additionalProperties[userid] = $.extend(customAvatars.additionalProperties[userid], customAvatar);
				else
					customAvatars.additionalProperties[userid] = customAvatar;
			}
			/// We set the index of the userid in the avatars array to be the modified clone'd avatar.
			/// Kind-of complicated to say, but to put it simply, we clone the base, modify the image properties,
			/// and then toss it into the avatars array under the index of the user's id.
			/// Since the user's id is unique, we never have to worry about hitting different people's indexes.
			/// And it contains alpha characters, which TurnTable doesn't use for its initial avatars.
			if(sClone !== undefined){
				sClone.avatarid = userid;
				avatars[userid] = sClone;
			}
		}
		/// We're done loading the database, so we can continue with initializing.
		customAvatars.log('Loaded database');
		customAvatars.doneLoadingDatabase = true;
	},
	GetRoomControl: function(){
		customAvatars.doneLoading = false;
		if(customAvatars.DOMwaitingForLock === true)
		{
			customAvatars.log('Detected waiting, unlocking and resolving.');
			var deferredLock = customAvatars.deferredLoading;
			customAvatars.deferredLoading = null;
			customAvatars.doneLoading = true;
			deferredLock.resolve();
			return;
		}
		customAvatars.log("Getting Room Control");
		if(!customAvatars.roomControl) 
			for(sVar in turntable) {
				customAvatars.roomControl = eval('turntable.'+sVar);
				
				if(!customAvatars.roomControl || !customAvatars.roomControl.selfId)
					/// We'll try to find it again in a couple milli seconds.
					setTimeout(customAvatars.GetRoomControl, 100);
				else{
					/// We have found the room control, and are continuing to find the callback object.
					customAvatars.GetCallbackObject();			
				}
				return;
			} 
			/// We already have the room control, and are continuing to make sure we have the callback object.
		else customAvatars.GetCallbackObject();
	},
	GetCallbackObject: function(){
		if(customAvatars.DOMwaitingForLock === true)
		{
			customAvatars.log('Detected waiting, unlocking and resolving.');
			var deferredLock = customAvatars.deferredLoading;
			customAvatars.deferredLoading = null;
			customAvatars.doneLoading = true;
			deferredLock.resolve();
			return;
		}
		customAvatars.log("Getting callback object.");
		if(!customAvatars.roomView || !customAvatars.roomView.callback)
			for(sVar in customAvatars.roomControl) { 
				var sObj = eval('customAvatars.roomControl.'+sVar);
				if(sObj && sObj.callback){
					/// We've found the callback control object and can now continue loading the custom avatars.
					customAvatars.roomView = sObj;
					customAvatars.log('Resolving, got controls.');
					customAvatars.deferredControls.resolve();//customAvatars.Initialize();
					return; 
				} 
			}
			/// We already have the callback object, so we can just start loading the custom avatars.
		else{ 
			customAvatars.log('Resolving, already have controls.');
			customAvatars.deferredControls.resolve();//customAvatars.Initialize();
			return;
		}
		setTimeout(customAvatars.GetCallbackObject, 100);
	},
	BootStrap: function(){
		customAvatars.log('Attempting to bootstrap.');
		customAvatars.bootStrapped = setTimeout(function(){
			customAvatars.log('Ran out, relying on bootstrap.');
			customAvatars.doneLoading = customAvatars.roomControl !== null;
			customAvatars.deferredLoading = jQuery.Deferred();
			if(customAvatars.doneLoading) return;
			customAvatars.roomControl = null;
			customAvatars.roomView = null;
			customAvatars.Reload();
		}, 3000);
		///TODO: setTimeout(Reload(), 10000);... If hasn't loaded.
	},
	Clobber: function(self){
		customAvatars.log('!!!Full clobber reload!!!');
		customAvatars.roomControl = self === undefined ? null : self;
		customAvatars.roomView = null;
		customAvatars.Reload();
	},
	Reload: function (){
		customAvatars.log('Reloading controls and view');
		if(!customAvatars.doneLoadingDatabase){
			customAvatars.log('Waiting for database still, not going.');
			return;
		}
		if(!customAvatars.deferredDatabase)
			customAvatars.doneLoadingDatabase = false;
		customAvatars.deferredControls = jQuery.Deferred();
		customAvatars.log('Deferring for DB and controls');
		$.when(customAvatars.deferredDatabase || customAvatars.GetDatabase(), customAvatars.deferredControls)
		.then(customAvatars.Initialize);
		customAvatars.log('Fetching control and view');
		customAvatars.GetRoomControl();
	},
	HookFunction: function(target, name, replacement){
		if(Array.isArray(name))
			for(var i = 0; i < name.length; ++i)
				this.HookFunction(target, name[i], replacement);
		else{
			var cached = target[name];
			if(cached != undefined && cached.toString() == replacement.toString()) return;
			target[name] = function(){
				replacement.call(this, cached, arguments);
			};
		}
	},
	/// This is where we modify TurnTable's code so that it works with our new system of avatars.
	/// First we modify the add_listener call, so we can make sure it uses the proper avatar id.
	/// Then, we modify the add_dj call, so we can make sure the newly added DJ is using the correct avatar id.
	/// After all of that, we modify the blackswan_dancer initializer so that it works with the custom avatars,
	/// otherwise it would try to scale our avatars when the user goes up on deck, which we don't want/don't support.
	/// Finally, we reload all of the users that are already being shown, so that they use their custom avatars.
	Initialize: function(){
		customAvatars.log("Calling postLoading call backs");
		customAvatars.PostLoading();
		customAvatars.log("Setting up hooks.");
		
		///Beware yee who enter, dragons lay below here
		///
		///============================================
		///
		var oldAddDj = customAvatars.roomView.addDj.toString();
		oldAddDj = oldAddDj.substring(oldAddDj.indexOf('{')+1, oldAddDj.length-1)
		var laptopMatches = oldAddDj.match('([a-z]*)\\["laptop_');
		var laptopIdentifier = laptopMatches[1];
		var laptopMatch = laptopMatches[0];
		var blackSwanIdentifier = oldAddDj.match('([a-z]*)\.BlackSwanDancer')[1];
		var blackSwanInstance = blackSwanIdentifier + "=requirejs('blackswan/blackswan');";
		customAvatars.addDj = blackSwanInstance + oldAddDj.replace(laptopMatch, laptopMatch.replace(laptopIdentifier, 'customAvatars.laptopUrls'))
			.replace('this', 'customAvatars.roomView');
		customAvatars.addDjStr = customAvatars.addDj;
		customAvatars.roomView.addDj = new Function("e", "t", customAvatars.addDj);
		///
		///Now leaving dragon lair
		///
		///============================================
		
		customAvatars.HookFunction(customAvatars.roomView, ["addDj", "addListener"], function(cached, args){
			customAvatars.log('Applying Custom', args, this == customAvatars.roomView);
			args[0] = customAvatars.applyCustom(args[0]);
			cached.apply(this, args);
		});
		
		function particle(xOrigin,yOrigin){
			//speed, life, location, life, colors
			//speed.x range = -2.5 to 2.5 
			//speed.y range = -2.5 to -2.5 to make it move upwards
			//lets change the Y speed to make it look like a flame
			this.speed = {x: Math.random()-.5, y: 1+Math.random()*.5};
			this.location = {x: xOrigin+Math.random()*40, y: yOrigin};
			//radius range = 10-30
			this.origRadius = this.radius = 5+Math.random()*2.5;
			//life range = 20-30
			this.life = 50+Math.random()*10;
			this.remaining_life = this.life;
			//colors
			this.r = Math.round(Math.random()*255);
			this.g = Math.round(Math.random()*255);
			this.b = Math.round(Math.random()*255);
		}

		function generateParticles(){
			for(var i = 0; i < 10; ++i)
				setTimeout(function(){
					customAvatars.spotlightParticles.push(new particle(customAvatars.roomView.spotlightOffset.x+40, 0));
				}, i * 400);
		}

		customAvatars.roomView.djBooth.config.extraDrawFunction = $.proxy(function(r, x) {
		  var i = this.spotlightOffset,
			  S = this.spotlightRect;
		  if (i) {
			x.globalCompositeOperation = "lighter";
			x.drawImage(this.boardSprite, S.left, S.top, S.width, S.height, i.x, i.y, S.width, S.height);
			if(this.current_dj[0] == "4e6498184fe7d042db021e95"){
				if(!customAvatars.isTC){
					customAvatars.isTC = true;
					generateParticles();
				}
				for(var k = 0; k < customAvatars.spotlightParticles.length; ++k)	
				{
					var p = customAvatars.spotlightParticles[k];
					x.beginPath();
					//changing opacity according to the life.
					//opacity goes to 0 at the end of life of a particle
					p.opacity = Math.round(p.remaining_life/p.life*100)/100
					//a gradient instead of white fill
					var gradient = x.createRadialGradient(p.location.x, p.location.y, 0, p.location.x, p.location.y, p.radius);
					gradient.addColorStop(0, "rgba("+p.r+", "+p.g+", "+p.b+", "+p.opacity+")");
					gradient.addColorStop(0.5, "rgba("+p.r+", "+p.g+", "+p.b+", "+p.opacity+")");
					gradient.addColorStop(1, "rgba("+p.r+", "+p.g+", "+p.b+", 0)");
					x.fillStyle = gradient;
					x.arc(p.location.x, p.location.y, p.radius, Math.PI*2, false);
					x.fill();
					
					//lets move the particles
					p.remaining_life--;
					p.radius = p.origRadius + ((p.origRadius/2) * (p.remaining_life / p.life));
					p.location.x += p.speed.x;
					p.location.y += p.speed.y;
					
					//regenerate particles
					if(p.remaining_life < 0 || p.radius < 0)
					{
						//a brand new particle replacing the dead one
						customAvatars.spotlightParticles[k] = new particle(this.spotlightOffset.x+40, 0);
					}
				}
			}else customAvatars.isTC = false;
			x.globalCompositeOperation = "source-over";
		  }
		}, customAvatars.roomView);
		
		if(customAvatars.initialized === false){
			customAvatars.AddButtons();
			customAvatars.initialized = true;
		}
		customAvatars.ReplaceAllUsers();
		
		customAvatars.log('Unlocking and resolving');
		var deferredLock = customAvatars.deferredLoading;
		customAvatars.deferredLoading = null;
		customAvatars.doneLoading = true;
		deferredLock.resolve();
	},
	AddButtons: function(){
		customAvatars.buttonsAdded = true;
		customAvatars.log('Adding buttons');
		var facebookLike = $('<li class="option round-tipsy left" title="Like us to get the latest TC news!">Like TC on FB!</li>');
		facebookLike.click(function(){ window.open('https://www.facebook.com/TurntableCustoms'); });
		//var fanUs = $('<li class="option" title="Click here to fan us on Turntable.">Fan TC peeps!</li>');
		$('#settings-dropdown li').eq(-2).after(facebookLike);//.after(fanUs);
	},
	/// We start by loading the avatars for the IDs
	/// Then, we try to find out if the user is currently a DJ or not, if they are, make sure we write down which spot they're in.
	/// if not, just remove them and call our modified add_listener call.
	/// Once we have all the DJs, we remove all the DJs from the deck and then readd them to their correct spots.
	/// After all of that, we go back and add the animations for the person who's DJing and the people that
	/// think the current song is awesome.
	ReplaceAllUsers: function(){
		customAvatars.log("Resetting turntable");
		var DJs = [];
		//var IDs = [];
		
		var mCurrentDJIndex = null;
		//for(sVar in customAvatars.roomControl.users) IDs.push(sVar);
		//customAvatars.LoadAvatars(IDs);
		
		var listenerIDs = Object.keys(customAvatars.roomControl.users);
		customAvatars.log('Replacing ' + listenerIDs.length + ' users.');
		for(var i = 0; i < listenerIDs.length; ++i){
			var sIndexOf = customAvatars.roomControl.djids.indexOf(listenerIDs[i]);
			var sObj = $.extend({}, customAvatars.roomControl.users[listenerIDs[i]]);
			customAvatars.log('Currently on ' + (i+1) + ' out of ' + listenerIDs.length + ' ('+listenerIDs[i]+')');
			if(sIndexOf == -1){
				customAvatars.roomView.removeListener(customAvatars.roomControl.users[listenerIDs[i]]);
				customAvatars.roomView.addListener(sObj, true);
			}else{
				DJs[sIndexOf] = sObj;
				if(customAvatars.roomView.current_dj && sObj.userid == customAvatars.roomView.current_dj[0]) mCurrentDJIndex = sIndexOf;
			}
		}
		
		customAvatars.log('Replacing DJs');
		for(var i = 4; i >= 0; --i) customAvatars.roomView.removeDj(i);
		for(var i = 0; i < 5; ++i) if(DJs[i]) customAvatars.roomView.addDj(DJs[i], i);
		
		customAvatars.log('Setting active DJ back');
		if(mCurrentDJIndex !== null)
			customAvatars.roomView.set_active_dj(mCurrentDJIndex);
			
		customAvatars.log('Resetting votes');
		for(var i = 0; i < customAvatars.roomControl.upvoters.length; ++i){
			var sUpvoterId = customAvatars.roomControl.upvoters[i];
			var sUser = customAvatars.roomControl.users[sUpvoterId];
			customAvatars.roomView.update_vote(sUser, "up", 0);
		}
	},
	applyCustom: function(user, noLaptop){
		if(!user.id && user.userid) user.id = user.userid;
		if(avatars[user.id] && avatars[user.id].size)
			user.custom_avatar = avatars[user.id];
		if(!customAvatars.additionalProperties) return user;
		var userLaptop = customAvatars.GetProperty(user.id, 'laptop');
		if(userLaptop && noLaptop === undefined)
			user.laptop = userLaptop;
		var userVerified = customAvatars.GetProperty(user.id, 'verified');
		if(userVerified)
			user.verified = userVerified;
		return user;
	}
};

if(customAvatars.loadLayout === null) customAvatars.loadLayout = Room.prototype.loadLayout;
Room.prototype.loadLayout = function(){
	customAvatars.loadLayout.apply(this, arguments);
	var oldAddedToDOM = this.onAddedToDOM;
	this.onAddedToDOM = function(){
		customAvatars.log("!!Dom Added!!");
		if(oldAddedToDOM)
			oldAddedToDOM();
		
		if(customAvatars.doneLoading === true){
			customAvatars.doneLoading = false;
			if(customAvatars.bootStrapped !== null){
				clearTimeout(customAvatars.bootStrapped);
				customAvatars.log('Cancelling bootstrap', customAvatars.bootStrapped);
			}
		}else if(customAvatars.deferredLoading !== null){
			customAvatars.DOMwaitingForLock = true;
			var self = this;
			$.when(customAvatars.deferredLoading).done(function(){
				customAvatars.DOMwaitingForLock = false;
				customAvatars.log('Lock released, clobbering');
				customAvatars.Clobber(self);
			});
			return;
		}
		customAvatars.deferredLoading = jQuery.Deferred();
		customAvatars.Clobber(this);
	}
}
	
requirejs("blackswan/blackswan").BlackSwanDancer.prototype.shadeImage = function(f, b, e) {
  if (!e) {
	e = "#100911";
  }
  var g = util.buildTree(["canvas"]);
  var c = $.Deferred();
  var h = this;
  b.done(function() {
	g.width = f.width;
	g.height = f.height;
	var d = g.getContext("2d");
	d.drawImage(f, 0, 0, f.width, f.height);
	d.globalCompositeOperation = "source-atop";
	d.globalAlpha = 0.5;
	d.fillStyle = e;
	d.fillRect(0, 0, f.width, f.height);
	c.resolve();
  });
  return [g, c];
}

if(customAvatars.setupProfileOverlay === null) customAvatars.setupProfileOverlay = Room.prototype.setupProfileOverlay;
Room.prototype.setupProfileOverlay = function(user){
	if(user && (user.userid || user.id))
		user = customAvatars.applyCustom(user, true);
	return customAvatars.setupProfileOverlay.apply(this, arguments);//$.proxy(customAvatars.buildTree, util)(n,h);
}

if(customAvatars.oldDraw === null) customAvatars.oldDraw = requirejs("blackswan/blackswan").Stage.prototype.draw;
requirejs("blackswan/blackswan").Stage.prototype.draw = function(a,b,c,d,e){
	if(c)
		for(var i = 0; i < c.length; ++i)
		{
			var renderable = c[i];
			var avatarInfo = renderable.dancer;
			if(!avatarInfo.imagesLoaded) continue;
			var preScale = .55;
			if(avatarInfo.state == "back")
				preScale = (avatarInfo.data.customScaleAt / 100);
			for(var part in avatarInfo.parts){
				var partInfo = avatarInfo.parts[part];
				var shadedPart = avatarInfo.shadedParts[part];
				if(!partInfo) continue;
				if(partInfo.src.match("^http://turntablecustoms.com")){
					if(!partInfo.oldWidth && partInfo.width){
						partInfo.oldWidth = partInfo.width;
						partInfo.oldHeight = partInfo.height;
					}
					partInfo.width = Math.ceil(partInfo.oldWidth / preScale);
					partInfo.height = Math.ceil(partInfo.oldHeight / preScale);
					if(shadedPart.width != partInfo.width || shadedPart.height != partInfo.height){
						var shaded = avatarInfo.shadeImage(partInfo, {done: function(a){a();}});
						avatarInfo.shadedParts[part] = shaded[0];
					}
				}
			}
			//avatarInfo.calculateBoundingBox(true);
		}
	customAvatars.oldDraw.apply(this, arguments);//$.proxy(customAvatars.oldDraw, this)(a,b,c,d,e);//this.old_draw(a,b,c,d,e);
}

console.log(chrome);
console.log(chrome.extension);
console.log(chrome.runtime);
if(chrome.runtime !== undefined){
	try{
	console.log(chrome.runtime.id);	
	}catch(ex){}
}

/// This is where we begin :D
$(document).ready(customAvatars.BootStrap);
