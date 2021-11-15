'use strict';

var lightweight = angular.module('lightweight', [
'ngResource', 
'ngAnimate', 
'ngFileUpload',
'ngSanitize'
])
.service("lightweight_firebase", [
"$rootScope",
"$q",
"$timeout",
"$firebaseObject",
"$firebaseArray",
"$firebaseAuth",
"uuid",
"$http",
"$window",
"$location",
function(
$rootScope,
$q,
$timeout,
$firebaseObject,
$firebaseArray,
$firebaseAuth,
uuid,
$http,
$window,
$location){

    var realtimeDatabase = firebase.database();
    var firebaseStorage = firebase.storage();
    $rootScope.auth = $firebaseAuth();
    $rootScope.userslist = [];

    // Start Here
    this.media = {
        "image": {
            create: function(arg){
                var defer = $q.defer();
                var imagelist = [];
                angular.forEach(arg, function(file) {
                    var metadata = {};
                    metadata.name = file.name;
                    return new Promise(function (resolve, reject) {
                        var task = firebaseStorage.ref().child('media/images').child(file.name).put(file, metadata);
                        task.on('state_changed',
                            function progress(snapshot){
                                file.percentage = snapshot.bytesTransferred / snapshot.totalBytes * 100;
                                file.filename = file.name;
                            },
                            function error(err){
                                $timeout(function(){
                                   $rootScope.$broadcast('server-event', {
                                        data:{
                                            message: file.name + " upload failed."
                                        }
                                    });
                                }, 500);
                            },
                            function complete(){
                                var obj = {};
                                obj.metadata = {};
                                var appended_cloud_source = "https://storage.googleapis.com/shonabbs-beauty-salon.appspot.com/media/images/"
                                obj.source = appended_cloud_source + task.snapshot.metadata.name;
                                file.source = obj.source;
                                if(file.tags) {obj.metadata.tags = file.tags};
                                obj.id = uuid.v4();

                                realtimeDatabase.ref().child('media/images').child(obj.id).set(obj, function(error){
                                    if(error){
                                        $timeout(function(){
                                            $rootScope.$broadcast('server-event', {
                                                data:{
                                                    message: "Error saving image."
                                                }
                                            });
                                        }, 500);
                                    } else {
                                        realtimeDatabase.ref().child('media/images').once('value')
                                        .then(function(snapshot) {
                                            snapshot.forEach(function(childSnapshot) {
                                                var childKey = childSnapshot.key;
                                                var childData = childSnapshot.val();
                                                var childDataValue = childData;
                                                childDataValue.id = childKey;
                                                imagelist.push(childDataValue);
                                            }); 
                                        })
                                        .catch(function(error) {
                                            console.log(error);
                                            $timeout(function(){
                                                $rootScope.$broadcast('server-event', {
                                                    data:{
                                                        message: "Error updating Media Vault. Please refresh."
                                                    }
                                                });
                                            }, 500);
                                        });
                                    }
                                });
                            }
                        );
                    });
                });
                defer.resolve(imagelist);
                $timeout(function(){
                   $rootScope.$broadcast('server-event', {
                        data:{
                            message: "Image uploaded"
                        }
                    });
                }, 500);
                return defer.promise;
            },
            read: function(){
               var defer = $q.defer();
                var imagelist = [];
                realtimeDatabase.ref().child('media/images')
                .once('value')
                .then(function(snapshot) {
                    snapshot.forEach(function(childSnapshot) {
                        var childKey = childSnapshot.key;
                        var childData = childSnapshot.val();
                        var childDataValue = childData;
                        childDataValue.id = childKey;
                        imagelist.push(childDataValue);
                        defer.resolve(imagelist);
                    });
                })
                .catch(function(error) {
                    console.log(error);
                });
                return defer.promise; 
            },
            update: function(arg){
                var imagelist = [];

                var validate_metadata = function(obj){
                    var value = "";
                    if(obj == null){
                        value = "";
                    } else {
                        value = obj;
                    }
                    return value;
                }

                arg.metadata.tags = validate_metadata(arg.metadata.tags);
                arg.metadata.cover = validate_metadata(arg.metadata.cover);
                arg.metadata.name = validate_metadata(arg.metadata.name);
                arg.metadata.description = validate_metadata(arg.metadata.description);

                var tags = arg.metadata.tags;
                var cover = arg.metadata.cover;
                var name = arg.metadata.name;
                var description = arg.metadata.description;

                var newMetadata = {
                    tags: tags,
                    cover: cover,
                    name: name,
                    description: description
                };

                realtimeDatabase.ref().child('media/images').child(arg.id).child("metadata").update(newMetadata, function(error){
                    if(error){
                        $timeout(function(){
                            $rootScope.$broadcast('server-event', {
                                data:{
                                    message: "Error updating image."
                                }
                            });
                        }, 500);
                    } else {
                        $timeout(function(){
                            $rootScope.$broadcast('server-event', {
                                data:{
                                    message: "Image updated."
                                }
                            });
                        }, 500);
                    }
                });
            },
            delete: function(arg){
                var image_source;
                var imagelist = [];
                
                image_source = arg.source.split('https://storage.googleapis.com/shonabbs-beauty-salon.appspot.com/media/images/').pop();
                
                firebaseStorage.ref().child('media/images').child('/' + image_source).delete()
                .then(function() {
                    $timeout(function(){
                        $rootScope.$broadcast('server-event', {
                            data:{
                                message: "Image removed from storage."
                            }
                        });
                    }, 500);
                }).catch(function(error) {
                    $timeout(function(){
                        $rootScope.$broadcast('server-event', {
                            data:{
                                message: "Error removing image from storage."
                            }
                        });
                    }, 500);
                });
            
                realtimeDatabase.ref().child('media/images').child(arg.id).remove()
                .then(function(){
                    realtimeDatabase.ref().child('media/images').once('value')
                    .then(function(snapshot) {
                        snapshot.forEach(function(childSnapshot) {
                            var childKey = childSnapshot.key;
                            var childData = childSnapshot.val();
                            var childDataValue = childData;
                            childDataValue.id = childKey;
                            imagelist.push(childDataValue);
                        });
                        $rootScope.imagelist = imagelist; 
                    });
                    $timeout(function(){
                        $rootScope.$broadcast('server-event', {
                            data:{
                                message: "Image removed from database."
                            }
                        });
                    }, 500);
                }).catch(function(error) {
                    $timeout(function(){
                        $rootScope.$broadcast('server-event', {
                            data:{
                                message: "Error removing image from database."
                            }
                        });
                    }, 500);
                });
            },
            download: function(arg){
                var image_source;
                if(arg.source){
                    image_source = arg.source.split('https://storage.googleapis.com/shonabbs-beauty-salon.appspot.com/media/images/').pop();
                    firebaseStorage.ref().child('media/images').child('/' + image_source).getDownloadURL()
                    .then(function(url){
                        var image_download = url;
                        $timeout(function(){
                            $rootScope.$broadcast('server-event', {
                                data:{
                                    message: "Image " + image_source + " downloaded."
                                }
                            });
                        },  500);
                    })
                    .catch(function(error) {
                        console.log(error);
                    });
                } else if (arg.avatar){
                    image_source = arg.avatar.split('https://storage.googleapis.com/shonabbs-beauty-salon.appspot.com/media/images/').pop();
                    firebaseStorage.ref().child('media/images').child('/' + image_source).getDownloadURL()
                    .then(function(url){
                        var image_download = url;
                        $timeout(function(){
                            $rootScope.$broadcast('server-event', {
                                data:{
                                    message: "Image " + image_source + " downloaded."
                                }
                            });
                        },  500);
                    })
                    .catch(function(error) {
                        console.log(error);
                    });
                }
            }
        },
        "tags": {
            update: function(arg){
                var tagsBucket = realtimeDatabase.ref().child('tags');
                var tagArray = $firebaseArray(tagsBucket);
                angular.forEach(arg, function(tag) {
                    return new Promise(function (resolve, reject) {
                        //Upload tag
                        var tagObj = {}
                        tagObj.tag = tag;
                        tagArray.$add(tagObj);
                        $rootScope.taglist.push(tagObj);
                    });
                });
                $timeout(function(){
                   $rootScope.$broadcast('server-event', {
                        data:{
                            message: "Tags added."
                        }
                    });
                }, 500);
            }
        }
    }

    this.users = {
        create: function(arg){
            var userslist = [];
            var data = {
                address : {
                    city : arg.address.city,
                    state : arg.address.state,
                    street : arg.address.street,
                    zipcode : arg.address.zipcode
                },
                birthday : arg.birthday,
                firstname : arg.firstname,
                lastname : arg.lastname,
                phone : arg.phone,
                email : arg.email,
                security : {
                    roles : arg.security.roles
                },
                permissions : {
                    email : true,
                    notifications : true
                },
                sender : $rootScope.me.token
            };
            $http({
                url: ("https://us-central1-shonabbs-beauty-salon.cloudfunctions.net/addUser"),
                method: 'POST',
                data: data
            })
            .then(function(response) {
                $rootScope.messageStatus = true;
                $timeout(function(){
                   $rootScope.$broadcast('server-event', {
                        data:{
                            message: "User added."
                        }
                    });
                }, 500);
                realtimeDatabase.ref().child('users').once("value")
                .then(function(snapshot) {
                    snapshot.forEach(function(childSnapshot) {
                        var childKey = childSnapshot.key;
                        var childData = childSnapshot.val();
                        childData.id = childKey;
                        userslist.push(childData);
                    });
                    $rootScope.userslist = userslist;
                    $rootScope.messageStatus = true;
                    $timeout(function(){
                       $rootScope.$broadcast('server-event', {
                            data:{
                                message: "Users list synced"
                            }
                        });
                    }, 1000);
                })
                .catch(function(error){
                    $timeout(function(){
                        $rootScope.$broadcast('server-event', {
                            data:{
                                message: 'User\'s list out of sync'
                            }
                        });
                    }, 500);
                });
            })
            .catch(function(response){
                $timeout(function(){
                    $rootScope.$broadcast('server-event', {
                        data:{
                            message: 'Registration failed ' + response.data
                        }
                    });
                }, 500);
            });
        },
        read: function(){
            var defer = $q.defer();
            var userslist = [];
            realtimeDatabase.ref().child('users')
            .once('value')
            .then(function(snapshot) {
                snapshot.forEach(function(childSnapshot) {
                    var childKey = childSnapshot.key;
                    var childData = childSnapshot.val();
                    childData.id = childKey;
                    userslist.push(childData);
                });
                defer.resolve(userslist);
            }).catch(function(error) {
                console.log("Insufficient Permissions");
                defer.reject();
            });
            return defer.promise;
        },
        "self": {
            read: function(){
                var defer = $q.defer();
                var user = {};
                realtimeDatabase.ref().child('users').child(arg).once('value')
                .then(function(snapshot) {
                    var childData = snapshot.val();
                    childData.id = arg;
                    defer.resolve(childData); 
                })
                .catch(function(error){
                    $timeout(function(){
                        $rootScope.$broadcast('server-event', {
                            data:{
                                message: "Hmmm. Let's keep going."
                            }
                        });
                    }, 500);
                });
                return defer.promise;
            },
            update: function(arg){
                var data = angular.toJson(arg);
                var update = JSON.parse(data);
                realtimeDatabase.ref().child('users').child($rootScope.me.id).update(update)
                .then(function(){
                    realtimeDatabase.ref().child('users').child($rootScope.me.id).once("value")
                    .then(function(snapshot) {
                        $rootScope.userslist[$rootScope.me.id] = snapshot.val();
                        $timeout(function(){
                           $rootScope.$broadcast('server-event', {
                                data:{
                                    message: "Account updated."
                                }
                            });
                        }, 500);
                    })
                    .catch(function(error){
                        $timeout(function(){
                            $rootScope.$broadcast('server-event', {
                                data:{
                                    message: "Something\'s wrong."
                                }
                            });
                        }, 500);
                    });
                }).catch(function(error) {
                    $timeout(function(){
                        $rootScope.$broadcast('server-event', {
                            data:{
                                message: "Failed to update account."
                            }
                        });
                    }, 500);
                });
            }
        },
        signup: function(arg, provider){
            if(provider == "password"){
                $rootScope.progressAnimation = true;
                var e = {};
                var address = {};
                var userslist = [];
                var data = {
                    // recaptcha : arg.recaptcha,
                    firstname: arg.firstname,
                    lastname: arg.lastname,
                    email : arg.email,
                    id: arg.uid,
                    provider: provider
                };
                $http({
                    url: ("https://us-central1-shonabbs-beauty-salon.cloudfunctions.net/signup"),
                    method: 'POST',
                    data: data
                })
                .then(function(response) {
                    $rootScope.messageStatus = true;
                    $rootScope.temp_login_data = {};
                    $timeout(function(){
                       $rootScope.$broadcast('server-event', {
                            data:{
                                message: "Account created."
                            }
                        });
                       $rootScope.progressAnimation = false;
                       $rootScope.is_new_user = true;
                       $rootScope.$broadcast('signup-event', {data:{}});
                    }, 500);
                })
                .catch(function(response) {
                    $rootScope.messageStatus = false;
                    $rootScope.progressAnimation = false;
                    $rootScope.$broadcast('server-event', {
                        data:{
                         message: "Error creating account."
                        }
                    });
                });
            }
        },
        update: function(arg){
            var data = angular.toJson(arg);
            var update = JSON.parse(data);
            realtimeDatabase.ref().child('users').child(arg.id).update(update)
            .then(function(){
                realtimeDatabase.ref().child('users').child(arg.id)
                .once("value")
                .then(function(snapshot) {
                    $rootScope.userslist[arg.id] = snapshot.val();
                    $timeout(function(){
                       $rootScope.$broadcast('server-event', {
                            data:{
                                message: "User updated."
                            }
                        });
                    }, 500);
                })
                .catch(function(error) {
                    $rootScope.messageStatus = false;
                    $rootScope.$broadcast('server-event', {
                        data:{
                         message: 'Error updating user.'
                        }
                    });
                });
            })
            .catch(function(error) {
                $rootScope.messageStatus = false;
                $rootScope.$broadcast('server-event', {
                    data:{
                     message: 'Failed to update user ' + response.data
                    }
                });
            });
        },
        delete: function(arg){
            var userslist = [];   
            var data = {
                sender : $rootScope.me.token,
                id: arg.id,
                email: arg.email
            };
            $http({
                url: ("https://us-central1-shonabbs-beauty-salon.cloudfunctions.net/deleteUser"),
                method: 'POST',
                data: data
            })
            .then(function(response) {
                realtimeDatabase.ref().child('users').once("value")
                .then(function(snapshot) {
                    snapshot.forEach(function(childSnapshot) {
                        var childKey = childSnapshot.key;
                        var childData = childSnapshot.val();
                        childData.id = childKey;
                        userslist.push(childData);
                    });
                    $rootScope.userslist = userslist;
                    $rootScope.messageStatus = true;
                    $timeout(function(){
                       $rootScope.$broadcast('server-event', {
                            data:{
                                message: "User deleted"
                            }
                        });
                    }, 500);
                }).catch(function(error) {
                    $rootScope.messageStatus = false;
                    $rootScope.$broadcast('server-event', {
                        data:{
                         message: 'Failed to read users. ' + response.data
                        }
                    });
                });
            }).catch(function(error) {
                $rootScope.messageStatus = false;
                $rootScope.$broadcast('server-event', {
                    data:{
                     message: 'Failed to delete user. ' + response.data
                    }
                });
            });
        },
        "roles": {
            read: function(){
                var defer = $q.defer();
                var rolelist = [];
                realtimeDatabase.ref().child('roles').once('value')
                .then(function(snapshot) {
                    snapshot.forEach(function(childSnapshot) {
                        var childKey = childSnapshot.key;
                        var childData = childSnapshot.val();
                        var childDataValue = {};
                        childDataValue.id = childKey;
                        childDataValue.role = childData;
                        rolelist.push(childDataValue);
                    });
                    defer.resolve(rolelist); 
                })
                .catch(function(error){
                    $rootScope.$broadcast('server-event', {
                        data:{
                            message: "Error retrieving roles"
                        }
                    });
                    defer.reject(false);
                });
                return defer.promise;
            }
        }
    }

    this.content = {
        "app": {
            update: function(arg){
                var index_content = arg.settings.configs.index_content;
                var save_path;
                if (index_content){
                    save_path = "index/" + arg.settings.configs.contentId;
                } else {
                    save_path = arg.settings.configs.contentId;
                }
                var data = angular.toJson($rootScope[arg.settings.configs.contentId]);
                var update = JSON.parse(data);
                realtimeDatabase.ref().child('data').child(save_path).set(update, function(error){
                    if(error){
                        $timeout(function(){
                           $rootScope.$broadcast('server-event', {
                                data:{
                                    message: "Error updating content."
                                }
                            });
                        }, 500);
                    } else {
                        $timeout(function(){
                           $rootScope.$broadcast('server-event', {
                                data:{
                                    message: "Content updated."
                                }
                            });
                        }, 500);
                    }
                });
            }
        },
        "pages": {
            create: function(arg, argData){
                // trim titles to become urls
                var trim_title = function(title){
                    var newURL = title.trim().toLowerCase().replace(/ /g,'-').replace(/[-]+/g, '-').replace(/[^\w-]+/g,'');
                    return newURL;
                }
                // trim titles to become urls

                var tagsBucket = realtimeDatabase.ref().child('tags');
                var tagArray = $firebaseArray(tagsBucket);

                // configure data structure
                var new_page_data = {};
                new_page_data.data = {};
                new_page_data.data.page = {};
                new_page_data.data.page.foreground = {};
                new_page_data.data.page.foreground.images = {};
                new_page_data.data.page.background = {};
                new_page_data.data.page.background.images = {};
                new_page_data.data.page.contents = [];
                if (arg == 'explore'){
                    var explore_items = {
                        "items": [
                            {
                                "data": "New Tab", 
                                "type": "title"
                            }
                        ]
                    }
                    new_page_data.data.page.contents.push(explore_items);
                }
                new_page_data.settings = {};
                new_page_data.settings.configs = {};
                // configure data structure

                // mock content
                var paragraphObj = {};
                paragraphObj.data = "It started with a paragraph...";
                paragraphObj.type = "text";

                var imageObj = {};
                imageObj.source = "https://storage.googleapis.com/shonabbs-beauty-salon.appspot.com/media/images/missing-image-wide.png";

                switch(arg){
                    case "info":
                        new_page_data.data.title = argData.title;
                        new_page_data.data.page.foreground.images.source = imageObj.source;
                        new_page_data.data.page.contents.push(paragraphObj);
                        new_page_data.settings.url = "/info/" + trim_title(argData.title);
                        new_page_data.settings.page_type = "info";
                        new_page_data.settings.name = argData.title;
                        new_page_data.settings.locked = false;
                        new_page_data.settings.configs.add_content = true;
                        new_page_data.settings.configs.contentId = "pages";
                        new_page_data.settings.configs.has_title_subtitle = false;
                        new_page_data.settings.configs.index_content = false;
                        new_page_data.settings.configs.multiview = false;
                        new_page_data.settings.configs.mulitview_label = "column";
                        new_page_data.settings.configs.primary_image = true;
                        new_page_data.settings.configs.reorder_content = true;
                        new_page_data.settings.configs.title_view = false;
                        $rootScope.pages.push(new_page_data);
                        var data = angular.toJson($rootScope.pages);
                        var update = JSON.parse(data);
                        realtimeDatabase.ref().child('data').child("pages").set(update, function(error){
                            if(error){
                                $timeout(function(){
                                    $rootScope.$broadcast('server-event', {
                                        data:{
                                            message: "Error adding page."
                                        }
                                    });
                                }, 500);
                            } else {
                                $timeout(function(){
                                    $rootScope.$broadcast('server-event', {
                                        data:{
                                            message: "Page added."
                                        }
                                    });
                                }, 500);
                            }
                        });
                        
                        break;
                    case "announcement":
                        new_page_data.data.title = argData.title;
                        new_page_data.data.page.contents.push(paragraphObj);
                        new_page_data.settings.url = "/announcement/" + trim_title(argData.title);
                        new_page_data.settings.page_type = "announcement";
                        new_page_data.settings.name = argData.title;
                        new_page_data.settings.locked = false;
                        new_page_data.settings.configs.add_content = true;
                        new_page_data.settings.configs.contentId = "pages";
                        new_page_data.settings.configs.has_title_subtitle = false;
                        new_page_data.settings.configs.index_content = false;
                        new_page_data.settings.configs.multiview = false;
                        new_page_data.settings.configs.mulitview_label = "column";
                        new_page_data.settings.configs.primary_image = false;
                        new_page_data.settings.configs.reorder_content = true;
                        new_page_data.settings.configs.title_view = false;
                        $rootScope.pages.push(new_page_data);
                        var data = angular.toJson($rootScope.pages);
                        var update = JSON.parse(data);
                        realtimeDatabase.ref().child('data').child("pages").set(update, function(error){
                            if(error){
                                $timeout(function(){
                                    $rootScope.$broadcast('server-event', {
                                        data:{
                                            message: "Error adding page."
                                        }
                                    });
                                }, 500);
                            } else {
                                $timeout(function(){
                                    $rootScope.$broadcast('server-event', {
                                        data:{
                                            message: "Page added."
                                        }
                                    });
                                }, 500);
                            }
                        });
                        break;
                    case "spotlight":
                        new_page_data.data.title = argData.title;
                        new_page_data.data.page.background.images.source = imageObj.source;
                        new_page_data.data.page.contents.push(paragraphObj);
                        new_page_data.settings.url = "/spotlight/" + trim_title(argData.title);
                        new_page_data.settings.page_type = "spotlight";
                        new_page_data.settings.name = argData.title;
                        new_page_data.settings.locked = false;
                        new_page_data.settings.configs.add_content = true;
                        new_page_data.settings.configs.contentId = "pages";
                        new_page_data.settings.configs.has_title_subtitle = false;
                        new_page_data.settings.configs.index_content = false;
                        new_page_data.settings.configs.multiview = false;
                        new_page_data.settings.configs.mulitview_label = "column";
                        new_page_data.settings.configs.primary_image = true;
                        new_page_data.settings.configs.reorder_content = true;
                        new_page_data.settings.configs.title_view = false;
                        $rootScope.pages.push(new_page_data);
                        var data = angular.toJson($rootScope.pages);
                        var update = JSON.parse(data);
                        realtimeDatabase.ref().child('data').child("pages").set(update, function(error){
                            if(error){
                                $timeout(function(){
                                    $rootScope.$broadcast('server-event', {
                                        data:{
                                            message: "Error adding page."
                                        }
                                    });
                                }, 500);
                            } else {
                                $timeout(function(){
                                    $rootScope.$broadcast('server-event', {
                                        data:{
                                            message: "Page added."
                                        }
                                    });
                                }, 500);
                            }
                        });
                        break;
                    case "blog":
                        new_page_data.data.title = argData.title;
                        new_page_data.data.subtitle = argData.subtitle;
                        new_page_data.data.headline = argData.headline;
                        new_page_data.data.author = $rootScope.me.firstname + " " + $rootScope.me.lastname;
                        new_page_data.data.date = new Date();
                        new_page_data.data.page.background.images.source = imageObj.source;
                        new_page_data.data.page.contents.push(paragraphObj);
                        new_page_data.settings.url = "/blog/" + trim_title(argData.title);
                        new_page_data.settings.page_type = "blog";
                        new_page_data.settings.name = argData.title;
                        new_page_data.settings.locked = false;
                        new_page_data.settings.configs.add_content = true;
                        new_page_data.settings.configs.contentId = "pages";
                        new_page_data.settings.configs.has_title_subtitle = true;
                        new_page_data.settings.configs.index_content = false;
                        new_page_data.settings.configs.multiview = false;
                        new_page_data.settings.configs.mulitview_label = "Section";
                        new_page_data.settings.configs.primary_image = false;
                        new_page_data.settings.configs.reorder_content = true;
                        new_page_data.settings.configs.title_view = false;
                        $rootScope.pages.push(new_page_data);
                        var data = angular.toJson($rootScope.pages);
                        var update = JSON.parse(data);
                        realtimeDatabase.ref().child('data').child("pages").set(update, function(error){
                            if(error){
                                $timeout(function(){
                                    $rootScope.$broadcast('server-event', {
                                        data:{
                                            message: "Error adding page."
                                        }
                                    });
                                }, 500);
                            } else {
                                $timeout(function(){
                                    $rootScope.$broadcast('server-event', {
                                        data:{
                                            message: "Page added."
                                        }
                                    });
                                }, 500);
                            }
                        });
                        break;
                    case "project":
                        new_page_data.data.title = argData.title;
                        var tagObj = {}
                        tagObj.tag = data.title;
                        var task = tagArray.$add(tagObj);
                        $rootScope.taglist.push(tagObj);
                        new_page_data.data.tag = argData.tag;
                        new_page_data.data.description = argData.description;
                        new_page_data.data.page.foreground.images.source = imageObj.source;
                        new_page_data.data.page.contents.push(paragraphObj);
                        new_page_data.settings.url = "/projects/" + trim_title(argData.title);
                        new_page_data.settings.page_type = "project";
                        new_page_data.settings.name = data.title;
                        new_page_data.settings.locked = false;
                        new_page_data.settings.configs.add_content = true;
                        new_page_data.settings.configs.contentId = "pages";
                        new_page_data.settings.configs.has_title_subtitle = false;
                        new_page_data.settings.configs.index_content = false;
                        new_page_data.settings.configs.multiview = false;
                        new_page_data.settings.configs.mulitview_label = "Section";
                        new_page_data.settings.configs.primary_image = true;
                        new_page_data.settings.configs.reorder_content = true;
                        new_page_data.settings.configs.title_view = false;
                        $rootScope.pages.push(new_page_data);
                        var data = angular.toJson($rootScope.pages);
                        var update = JSON.parse(data);
                        realtimeDatabase.ref().child('data').child("pages").set(update, function(error){
                            if(error){
                                $timeout(function(){
                                    $rootScope.$broadcast('server-event', {
                                        data:{
                                            message: "Error adding page."
                                        }
                                    });
                                }, 500);
                            } else {
                                $timeout(function(){
                                    $rootScope.$broadcast('server-event', {
                                        data:{
                                            message: "Page added."
                                        }
                                    });
                                }, 500);
                            }
                        });
                        break;
                    case "explore":
                        new_page_data.data.title = argData.title;
                        new_page_data.data.page.contents[0].items.push(paragraphObj);
                        new_page_data.settings.url = "/explore/" + trim_title(argData.title);
                        new_page_data.data.page.tabs = [];
                        new_page_data.data.page.tabs.push("New Tab");
                        new_page_data.settings.page_type = "explore";
                        new_page_data.settings.name = argData.title;
                        new_page_data.settings.locked = false;
                        new_page_data.settings.configs.add_content = true;
                        new_page_data.settings.configs.contentId = "pages";
                        new_page_data.settings.configs.has_title_subtitle = false;
                        new_page_data.settings.configs.index_content = false;
                        new_page_data.settings.configs.multiview = true;
                        new_page_data.settings.configs.mulitview_label = "tab";
                        new_page_data.settings.configs.primary_image = false;
                        new_page_data.settings.configs.reorder_content = true;
                        new_page_data.settings.configs.title_view = false;
                        $rootScope.pages.push(new_page_data);
                        var data = angular.toJson($rootScope.pages);
                        var update = JSON.parse(data);
                        realtimeDatabase.ref().child('data').child("pages").set(update, function(error){
                            if(error){
                                $timeout(function(){
                                    $rootScope.$broadcast('server-event', {
                                        data:{
                                            message: "Error adding page."
                                        }
                                    });
                                }, 500);
                            } else {
                                $timeout(function(){
                                    $rootScope.$broadcast('server-event', {
                                        data:{
                                            message: "Page added."
                                        }
                                    });
                                }, 500);
                            }
                        });
                        break;
                    default:
                        return;
                }
            },
            delete: function(arg){
                var settings = $rootScope.pages[arg].settings;
                if(settings.locked == false){
                    $rootScope.pages.splice(arg, 1);
                    var data = angular.toJson($rootScope.pages);
                    var update = JSON.parse(data);
                    realtimeDatabase.ref().child('data').child("pages").set(update);
                    $timeout(function(){
                       $rootScope.$broadcast('server-event', {
                            data:{
                                message: "Page removed."
                            }
                        });
                    }, 500);
                } else {
                    $timeout(function(){
                       $rootScope.$broadcast('server-event', {
                            data:{
                                message: "Failed To Remove Page"
                            }
                        });
                    }, 500);
                }
            }
        },
        "navigation": {
            update: function(){
                var data = angular.toJson($rootScope.settings.navigation);
                var update = JSON.parse(data);
                realtimeDatabase.ref('/data/settings/navigation').set(update, function(error){
                    if(error){
                        $timeout(function(){
                        $rootScope.$broadcast('server-event', {
                            data:{
                                message: "Error updating navigation."
                            }
                        });
                    }, 500);
                    } else {
                        $timeout(function(){
                        $rootScope.$broadcast('server-event', {
                            data:{
                                message: "Navigation updated."
                            }
                        });
                    }, 500);
                    }
                });
            }
        },
        "settings": {
            update: function(){
                var data = angular.toJson($rootScope.settings.data);
                var update = JSON.parse(data);
                realtimeDatabase.ref('/data/settings/data').set(update, function(error){
                    if(error){
                        $timeout(function(){
                        $rootScope.$broadcast('server-event', {
                            data:{
                                message: "Error updating company settings."
                            }
                        });
                    }, 500);
                    } else {
                        $timeout(function(){
                        $rootScope.$broadcast('server-event', {
                            data:{
                                message: "Company settings updated."
                            }
                        });
                    }, 500);
                    }
                });
            }
        }
    }

    this.get_chatter = function(arg){
        return result;
    }

    this.archive = function(arg, argTo){
        return result;
    }

}])
.directive('capitalize', function() {
    return {
        require: 'ngModel',
        link: function(scope, element, attrs, modelCtrl) {
            var capitalize = function(inputValue) {
                if (inputValue == undefined) inputValue = '';
                var capitalized = inputValue.toUpperCase();
                if (capitalized !== inputValue) {
                    // see where the cursor is before the update so that we can set it back
                    var selection = element[0].selectionStart;
                    modelCtrl.$setViewValue(capitalized);
                    modelCtrl.$render();
                    // set back the cursor after rendering
                    element[0].selectionStart = selection;
                    element[0].selectionEnd = selection;
                }
                return capitalized;
            }
            modelCtrl.$parsers.push(capitalize);
            capitalize(scope[attrs.ngModel]); // capitalize initial value
        }
    };
})
.filter('startFrom', function() {
    return function(input, start) {
        if(input){
            var input = input;
            start = +start; //parse to int
            return input.slice(start);
        }
    }
})
.controller('lightweightController', [
'$rootScope', 
'$scope',  
'$timeout', 
'$location',
'$window', 
'$route',
'$mdToast', 
'$q',
'$firebaseObject',
'$firebaseArray',
'$firebaseAuth',
'lightweight_firebase',
'$interval',
'filterFilter',
'uuid',
'$http',
function (
$rootScope, 
$scope,  
$timeout,  
$location,
$window,
$route,
$mdToast, 
$q,
$firebaseObject,
$firebaseArray,
$firebaseAuth,
lightweight_firebase,
$interval,
filterFilter,
uuid,
$http){

    ////////////////////////////////// Firebase Init
    var realtimeDatabase = firebase.database();
    var firebaseStorage = firebase.storage();
    $rootScope.auth = $firebaseAuth();
    ////////////////////////////////// Firebase Init


    ////////////////////////////////// Variables and scoped variables
    ////////////////////////////////// Variables and scoped variables
    ////////////////////////////////// Variables and scoped variables
    
    var newStaffIndex = 0;
    var newGalleryIndex = 0;
    var imagelist = [];
    var img_obj = null;
    var videolist = [];
    var vid_obj = null;
    var userslist = [];
    var events = {};

    $rootScope.rolelist = [];
    $rootScope.imagelist = [];
    $rootScope.editMedia = false;
    $rootScope.galleriesgridview = true;
    $rootScope.staffgridview = true;
    $rootScope.new_staff_member = false;
    $rootScope.individual_message_is_visible = false;
    $rootScope.individual_receipt_is_visible = false;
    $rootScope.setting = "Company Info";
    $rootScope.mediaView = "media";
    $rootScope.newPageData = {};
    $rootScope.email_verified = false;
    $rootScope.editor_fling_is_open = false;
    $rootScope.backend_fling_is_open = false;
    $rootScope.is_new_user = false;
    $rootScope.subscription_being_edited = {};
    $rootScope.open_subscription_editor = function(subscription){
        $rootScope.edit_subscription = true;
        $rootScope.subscription_being_edited = subscription;
    }
    $rootScope.update_subscription = function(subscription){

    }
    $rootScope.close_subscription_editor = function(){
        $rootScope.edit_subscription = false;
        $rootScope.subscription_being_edited = {};
    }

    ////////////////////////////////// Variables and scoped variables
    ////////////////////////////////// Variables and scoped variables
    ////////////////////////////////// Variables and scoped variables




    ///////////////////////////////////////////////////// View Controls
    ///////////////////////////////////////////////////// View Controls
    ///////////////////////////////////////////////////// View Controls

    $rootScope.edit = function(configs, page){
        if (page && configs.contentId == 'pages'){
            var param = page.settings.url;
            var page_selected_url = JSON.stringify(param);
            var continue_looping = true;
            var load_page = function(){
                for(let i = 0, l = $rootScope.pages.length; i < l && continue_looping == true; i++) {
                    var raw_url = $rootScope.pages[i].settings.url;
                    var url = JSON.stringify(raw_url);
                    if(url == page_selected_url){
                        continue_looping = false;
                        $rootScope.editor_element = $rootScope.pages[i];
                    }
                }
            }
            load_page();
        } else {
            $rootScope.editor_element = $rootScope[configs.contentId];
        }
        
        $rootScope.edit_mode = true;
    }
    $rootScope.end_edit = function(){
        $rootScope.editor_element = null;
        $rootScope.edit_mode = false;
    }
    $rootScope.open_edit_configuration = function(){
        $rootScope.edit_configuration_dialog_visible = true;
    }
    $rootScope.close_edit_configuration = function(){
        $rootScope.edit_configuration_dialog_visible = false;
    }
    $rootScope.openMediaVault = function(element) {
        $rootScope.elementToUpdate = element;
        $rootScope.media_vault_visible = true;
    }
    $rootScope.closeMediaVault = function() {
        $rootScope.elementToUpdate = null;
        $rootScope.media_vault_visible = false;
    }
    $rootScope.mediavault_filepicker = function(img_obj){
        $rootScope.$broadcast('mediavault', {
            data:{
                img_obj: img_obj
            }
        });
    }
    $rootScope.$on('mediavault', function(event, args) {
        $rootScope.media_vault_visible = true;
        img_obj = args.data.img_obj;
        $rootScope.elementToUpdate = true;
    });
    $rootScope.selectMedia = function(selected){
        img_obj.source = selected;
        $rootScope.elementToUpdate = false;
        $timeout(function(){
            $rootScope.$broadcast('server-event', {
                data:{
                    message: "Image selected."
                }
            });
        }, 500);
    }
    $rootScope.openUserVault = function() {
        $rootScope.user_vault_visible = true;
    }
    $rootScope.closeUserVault = function() {
        $rootScope.user_vault_visible = false;
    }
    $rootScope.selectUser = function(user){
        $rootScope.selectedUser = user;
        $rootScope.user_vault_detail_visible = true;
    }
    $rootScope.openMyVault = function() {
        $rootScope.my_vault_detail_visible = true;
    }
    $rootScope.closeMyVault = function() {
        $rootScope.my_vault_detail_visible = false;
    }
    $rootScope.openAddUser = function() {
        $rootScope.user_vault_add_user_visible = true;
    }
    $rootScope.closeAddUser = function() {
        $rootScope.user_vault_add_user_visible = false;
    }
    $rootScope.closeUserVaultDetail = function(){
        $rootScope.selectedUser = null;
        $rootScope.user_vault_detail_visible = false;
    }
    $rootScope.openPasswordReset = function(me){
        $rootScope.reset_password_visible = true;
        $rootScope.accountEmailPasswordReset = me.email;
    }
    $rootScope.closePasswordReset = function(){
        $rootScope.reset_password_visible = false;
    }
    $rootScope.sidebarOpen = false;
    $rootScope.toggleSidebar = function(){
        if($rootScope.sidebarOpen){
            $rootScope.sidebarOpen = false;
        } else {
            $rootScope.sidebarOpen = true;
        }
    }
    $rootScope.editor_hidden = false;
    $rootScope.toggleEditorVisibility = function(){
        if($rootScope.editor_hidden){
            $rootScope.editor_hidden = false;
        } else {
            $rootScope.editor_hidden = true;
        }
    }
    $rootScope.toggleNotificationDialog = function(arg){
        if($rootScope.notification_dialog_open){

        } else {

        }
    }
    $rootScope.closeAllApps = function(){
        $rootScope.close_edit_configuration();
        $rootScope.closeMediaVault();
        $rootScope.closeUserVault();
        $rootScope.closeMyVault();
        $rootScope.closeAddUser();
        $rootScope.closeUserVaultDetail();
        $rootScope.closePasswordReset();
    }

    ///////////////////////////////////////////////////// View Controls
    ///////////////////////////////////////////////////// View Controls
    ///////////////////////////////////////////////////// View Controls


    ///////////////////////////////////////////////////// Read Data From Lightweight Firebase Database
    ///////////////////////////////////////////////////// Read Data From Lightweight Firebase Database
    ///////////////////////////////////////////////////// Read Data From Lightweight Firebase Database

    lightweight_firebase.users.read()
    .then(function(result){
        if(result.length > 0){
            $rootScope.userslist = result;
            userslist = result;
            $rootScope.usersPageSize = 20;
            $rootScope.currentUserPage = 0;
            $rootScope.numberOfUserPages = Math.ceil($rootScope.userslist.length/$rootScope.usersPageSize);
        }
    });

    lightweight_firebase.users.roles.read()
    .then(function(result){
        if(result.length > 0){
            $rootScope.rolelist = result;     
        }
    });

    lightweight_firebase.media.image.read()
    .then(function(result){
        $rootScope.imagelist = result;
        imagelist = result;
        $rootScope.pageSize = 12;
        $scope.currentPage = 0;
        $rootScope.numberOfPages = Math.ceil($rootScope.imagelist.length/$rootScope.pageSize);
    });
    ///////////////////////////////////////////////////// Read Data From Lightweight Firebase Database
    ///////////////////////////////////////////////////// Read Data From Lightweight Firebase Database
    ///////////////////////////////////////////////////// Read Data From Lightweight Firebase Database


    ///////////////////////////////////////////////////// Check if user is authorized to view tools
    ///////////////////////////////////////////////////// Check if user is authorized to view tools
    ///////////////////////////////////////////////////// Check if user is authorized to view tools

    $rootScope.isAuthorized = function(app, roles){
        var result;
        switch(app){
            case "AppLab":
                // if(roles === "Lightweight Internet Coordinator" || roles === "Lightweight Support"){
                //     result = true;
                // } else {
                //     result = false;
                // }
                roles === "Lightweight Internet Coordinator" ? result = true : roles === "Lightweight Support" ? result = true : result = false;
                break;
            case "MediaVault":
                if(roles === "Lightweight Internet Coordinator" || roles === "Lightweight Support" || roles === "Professional"){
                    result = true;
                } else {
                    result = false;
                }
                break;
            case "UserVault":
                if(roles === "Lightweight Internet Coordinator" || roles === "Lightweight Support" || roles === "Professional" || roles === "Executive"){
                    result = true;
                } else {
                    result = false;
                }
                break;
            case "Settings":
                if(roles === "Lightweight Internet Coordinator" || roles === "Lightweight Support" || roles === "Executive"){
                    result = true;
                } else {
                    result = false;
                }
                break;
            default:
                return;
        }
        return result;
    }
    
    ///////////////////////////////////////////////////// Check if user is authorized to view tools
    ///////////////////////////////////////////////////// Check if user is authorized to view tools
    ///////////////////////////////////////////////////// Check if user is authorized to view tools











    ///////////////////////////////////////////////////// User Vault View Methods
    ///////////////////////////////////////////////////// User Vault View Methods
    ///////////////////////////////////////////////////// User Vault View Methods

    $rootScope.queryUser = function(query){
        $rootScope.currentUserPage = 0;
        $rootScope.userslist = filterFilter($rootScope.userslist,query);
        $rootScope.numberOfUserPages = Math.ceil($rootScope.userslist.length/$rootScope.pageSize);
    }
    $rootScope.clearQueryUser = function(){
        $rootScope.currentUserPage = 0;
        $rootScope.queryUserFilter = undefined;
        $rootScope.userslist = userslist;
        $rootScope.numberOfUserPages = Math.ceil($rootScope.userslist.length/$rootScope.pageSize);
    }
    var notification_permission_check = function(){

    }

    ///////////////////////////////////////////////////// User Vault View Methods
    ///////////////////////////////////////////////////// User Vault View Methods
    ///////////////////////////////////////////////////// User Vault View Methods
    









    ///////////////////////////////////////////////////// User Vault Database CRUD Operations
    ///////////////////////////////////////////////////// User Vault Database CRUD Operations
    ///////////////////////////////////////////////////// User Vault Database CRUD Operations

    $rootScope.sign_up = {};

    $rootScope.signup_with_email_password = function(user){
        $rootScope.temp_login_data = user;
        var error_var = false;
        $rootScope.auth.$createUserWithEmailAndPassword(user.email, user.password)
        .catch(function(error) {
            error_var = true;
            // Handle Errors here.
            var errorCode = error.code;
            var errorMessage = error.message;
            // ...
        });
    }

    $rootScope.signup_email_password_new_user = function(user){
        var error_var = false;
        $rootScope.auth.$createUserWithEmailAndPassword(user.email, user.password)
        .then(function(result) {
            var new_user = result.user;
            user.uid = new_user.uid;
            lightweight_firebase.users.signup(user, "password");
        })
        .catch(function(error) {
            error_var = true;
            // Handle Errors here.
            var errorCode = error.code;
            var errorMessage = error.message;
            // ...
        });        
    }
    // Sign In

    $rootScope.progressAnimation = false;

    $rootScope.signIn = function(arg){
        $rootScope.progressAnimation = true;
        $rootScope.auth.$signInWithEmailAndPassword(arg.email, arg.password)
        .then(function(user) {
            $timeout(function(){
               $rootScope.progressAnimation = false;
            }, 2000);
            if ($location.path() == '/login'){
                $location.path("/");
            }
        })
        .catch(function(error) {
            $rootScope.progressAnimation = false;
            var errorCode = error.code;
            var errorMessage = error.message;
            $rootScope.$broadcast('server-event', {
                data:{
                    message: errorMessage + "."
                }
            });
        });
    };

    $rootScope.googleSignIn = function(){
        $rootScope.auth.$signInWithRedirect("google")
        .then(function() {
        // Never called because of page redirect
        // Instead, use $onAuthStateChanged() to detect successful authentication
        }).catch(function(error) {
            console.error("Authentication failed:", error);
        });
    }

    $rootScope.facebookSignIn = function(){
        $rootScope.auth.$signInWithRedirect("facebook")
        .then(function() {
        // Never called because of page redirect
        // Instead, use $onAuthStateChanged() to detect successful authentication
        }).catch(function(error) {
            $rootScope.progressAnimation = false;
            console.error("Authentication failed:", error);
        });
    }

    // Sign In

    // Reset My Password
    $rootScope.resetPassword = function(creds){
        $rootScope.auth.$sendPasswordResetEmail(creds).then(function() {
            $timeout(function(){
                $rootScope.$broadcast('server-event', {
                    data:{
                        message: "Check your email for a password reset link."
                    }
                });
            }, 500);
        }).catch(function(error) {
            $timeout(function(){
                $rootScope.$broadcast('server-event', {
                    data:{
                        message: "Oops! Error seding your password reset link."
                    }
                });
            }, 500);
        });
    }
    // Reset My Password

    $rootScope.newUserSignup = function(user){
        lightweight_firebase.users.signup(user);
    }

    // Create Internal User Op
    $rootScope.addInternalUser = function(user){
        lightweight_firebase.users.create(user);
    }
    // Create Internal User Op

    // Modify User Op
    $rootScope.updateUser = function(user){
        lightweight_firebase.users.update(user);
    }
    $rootScope.updateMe = function(myAccount){
        lightweight_firebase.users.self.update(myAccount);
    }
    // Modify User Op

    // Delete User Op
    $rootScope.deleteUser = function(user){
        lightweight_firebase.users.delete(user);
    }
    // Delete User Op

    ///////////////////////////////////////////////////// User Vault Database CRUD Operations
    ///////////////////////////////////////////////////// User Vault Database CRUD Operations
    ///////////////////////////////////////////////////// User Vault Database CRUD Operations    

    ///////////////////////////////////////////////////// Media Vault View Controls
    ///////////////////////////////////////////////////// Media Vault View Controls
    ///////////////////////////////////////////////////// Media Vault View Controls
    $rootScope.queryMedia = function(query){
        $rootScope.imagelist = filterFilter(imagelist,query);
        $rootScope.currentPage = 0;
        $rootScope.numberOfPages = Math.ceil($rootScope.imagelist.length/$rootScope.pageSize);
    }
    $rootScope.clearQueryMedia = function(){
        $rootScope.currentPage = 0;
        $rootScope.queryFilter = undefined;
        $rootScope.imagelist = imagelist;
        $rootScope.numberOfPages = Math.ceil($rootScope.imagelist.length/$rootScope.pageSize);
    }
    ///////////////////////////////////////////////////// Media Vault View Controls
    ///////////////////////////////////////////////////// Media Vault View Controls
    ///////////////////////////////////////////////////// Media Vault View Controls

    ///////////////////////////////////////////////////// Media Vault Database CRUD Operations
    ///////////////////////////////////////////////////// Media Vault Database CRUD Operations
    ///////////////////////////////////////////////////// Media Vault Database CRUD Operations

    $rootScope.add_images = function(arg){
        lightweight_firebase.media.image.create(arg).then(function(result){$rootScope.imagelist = result;});
    }
    $rootScope.updateMedia = function(image){
        lightweight_firebase.media.image.update(image);
    }
    $rootScope.downloadMedia = function(image){
        lightweight_firebase.media.image.download(image);
    }
    $rootScope.deleteMedia = function(image){
        lightweight_firebase.media.image.delete(image);
    }

    $rootScope.tags = [];
    $rootScope.updateTags = function(tags){        
        lightweight_firebase.media.tags.update(tags);
        $rootScope.tags = [];
    }

    ///////////////////////////////////////////////////// Media Vault Database CRUD Operations
    ///////////////////////////////////////////////////// Media Vault Database CRUD Operations
    ///////////////////////////////////////////////////// Media Vault Database CRUD Operations

    var notification_permission_check = function(){

    }
    $rootScope.clearForm = function(form){
        $rootScope.indexForm = {};
        $rootScope.spotlightForm = {};
        $rootScope.blogForm = {};
        form.$setPristine();
        form.$setUntouched();
    }


    ///////////////////////////////////////////////////// Add Pages
    ///////////////////////////////////////////////////// Add Pages
    ///////////////////////////////////////////////////// Add Pages

    $rootScope.addPage = function(type, data){
        lightweight_firebase.content.pages.create(type, data);
    }

    ///////////////////////////////////////////////////// Add Pages
    ///////////////////////////////////////////////////// Add Pages
    ///////////////////////////////////////////////////// Add Pages

    ///////////////////////////////////////////////////// Delete Pages
    ///////////////////////////////////////////////////// Delete Pages
    ///////////////////////////////////////////////////// Delete Pages

    $rootScope.deletePage = function(page_index){
        lightweight_firebase.content.pages.delete(page_index);
    }

    ///////////////////////////////////////////////////// Delete Pages
    ///////////////////////////////////////////////////// Delete Pages
    ///////////////////////////////////////////////////// Delete Pages
    
    ///////////////////////////////////////////////////// Crud Navigation
    ///////////////////////////////////////////////////// Crud Navigation
    ///////////////////////////////////////////////////// Crud Navigation

    $rootScope.parentNav = function(item){
        $rootScope.parentNavName = item.navigation.parent.name;
        $rootScope.child_nav_items = item.navigation.child.data;
    }

    $rootScope.addChildNavItem = function(){
        var childNavObj = {};
        childNavObj.enabled = true;
        $rootScope.child_nav_items.push(childNavObj);       
    }

    $rootScope.updateNavigation = function(){
        lightweight_firebase.content.navigation.update();
    }
    ///////////////////////////////////////////////////// Crud Navigation
    ///////////////////////////////////////////////////// Crud Navigation
    ///////////////////////////////////////////////////// Crud Navigation





    ///////////////////////////////////////////////////// Crud Settings
    $rootScope.updateSettings = function(){
        lightweight_firebase.content.settings.update();
    }
    ///////////////////////////////////////////////////// Crud Settings





    ///////////////////////////////////////////////////// Update App
    $rootScope.updateApp = function(element){
        lightweight_firebase.content.app.update(element);
    }
    ///////////////////////////////////////////////////// Update App


    ///////////////////////////////////////////////////// Send Lead
    $rootScope.sendLead = function(lead, source){
        var data = {
            recaptcha : lead.recaptcha,
            name : lead.name,
            email : lead.email,
            message : lead.message,
            source : source
        };
        $rootScope.form_submission = true;

        $http({
            url: "https://us-central1-shonabbs-beauty-salon.cloudfunctions.net/lead",
            method: 'POST',
            data: data
        })
        .then(function success (response) {
            $rootScope.messageStatus = true;
            $rootScope.form_submission = false;
            $timeout(function(){
               $rootScope.$broadcast('server-event', {
                    data:{
                        message: "Message Sent."
                    }
                });
            }, 500);
        }, function failure (response) {
            $rootScope.messageStatus = false;
            $rootScope.form_submission = false;
            $rootScope.$broadcast('server-event', {
                data:{
                message: 'Message Sending Failed.'
                }
            });
        });
    }
    ///////////////////////////////////////////////////// Send Lead



    ///////////////////////////////////////////////////// My Vault
    $rootScope.view_notification = function(id){
        $rootScope.individual_message_is_visible = true;
        $rootScope.my_message = $rootScope.me.chatter[id];
        console.log($rootScope.me.chatter[id])
    }
    $rootScope.close_notification = function(){
        $rootScope.individual_message_is_visible = false;
        $rootScope.my_message = null;
    }
    $rootScope.view_receipt = function(receipt){
        $rootScope.individual_receipt_is_visible = true;
        $rootScope.my_receipt = receipt;
    }
    $rootScope.close_receipt = function(){
        $rootScope.individual_receipt_is_visible = false;
        $rootScope.my_receipt = null;
    }
    $scope.refresh_notifications = function(){
        var messages = realtimeDatabase.ref().child('users/' + $rootScope.me.id + '/messages/');
        $rootScope.me.messages = {};
        messages
        .once('value')
        .then(function(snapshot) {
            $rootScope.me.messages = snapshot.val();
        })
        .catch(function(error) {
            console.log(error);
        });
    }
    ///////////////////////////////////////////////////// My Vault



}]);