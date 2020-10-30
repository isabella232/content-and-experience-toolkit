/**
 * Copyright (c) 2019 Oracle and/or its affiliates. All rights reserved.
 * Licensed under the Universal Permissive License v 1.0 as shown at http://oss.oracle.com/licenses/upl.
 */
/* global console, __dirname, process, console */
/* jshint esversion: 6 */

var serverUtils = require('../test/server/serverUtils.js'),
	serverRest = require('../test/server/serverRest.js'),
	componentUtils = require('./component.js').utils,
	fs = require('fs'),
	sprintf = require('sprintf-js').sprintf,
	path = require('path');

var projectDir,
	typesSrcDir,
	serversSrcDir;

/**
 * Verify the source structure before proceed the command
 * @param {*} done 
 */
var verifyRun = function (argv) {
	projectDir = argv.projectDir;

	var srcfolder = serverUtils.getSourceFolder(projectDir);

	typesSrcDir = path.join(srcfolder, 'types');

	serversSrcDir = path.join(srcfolder, 'servers');

	return true;
};

module.exports.createRepository = function (argv, done) {
	'use strict';

	if (!verifyRun(argv)) {
		done();
		return;
	}

	var serverName = argv.server;
	var server = serverUtils.verifyServer(serverName, projectDir);
	if (!server || !server.valid) {
		done();
		return;
	}
	console.log(' - server: ' + server.url);

	var name = argv.name;
	var typeNames = argv.contenttypes ? argv.contenttypes.split(',') : [];
	var channelNames = argv.channels ? argv.channels.split(',') : [];
	var desc = argv.description;
	var defaultLanguage = argv.defaultlanguage;

	var channels = [];
	var contentTypes = [];

	serverUtils.loginToServer(server, serverUtils.getRequest()).then(function (result) {
		if (!result.status) {
			console.log(' - failed to connect to the server');
			done();
			return;
		}
		serverRest.getRepositories({
				server: server
			})
			.then(function (result) {
				if (result.err) {
					return Promise.reject();
				}
				// get repositories
				var repositories = result || [];
				for (var i = 0; i < repositories.length; i++) {
					if (name.toLowerCase() === repositories[i].name.toLowerCase()) {
						console.log('ERROR: repository ' + name + ' already exists');
						return Promise.reject();
					}
				}
				console.log(' - verify repository name');

				// get content types
				var typePromises = [];
				for (var i = 0; i < typeNames.length; i++) {
					typePromises.push(serverRest.getContentType({
						server: server,
						name: typeNames[i]
					}));
				}

				return Promise.all(typePromises);
			})
			.then(function (results) {
				for (var i = 0; i < results.length; i++) {
					if (results[i].err) {
						return Promise.reject();
					}
				}
				if (typeNames.length > 0) {
					console.log(' - verify content types');
				}

				// get channels
				var channelPromises = [];
				if (channelNames.length > 0) {
					channelPromises.push(serverRest.getChannels({
						server: server
					}));
				}

				return Promise.all(channelPromises);
			})
			.then(function (results) {
				var allChannels = results.length > 0 ? results[0] : [];
				for (var i = 0; i < channelNames.length; i++) {
					var found = false;
					for (var j = 0; j < allChannels.length; j++) {
						if (channelNames[i].toLowerCase() === allChannels[j].name.toLowerCase()) {
							found = true;
							channels.push({
								id: allChannels[j].id,
								name: allChannels[j].name
							});
							break;
						}
					}
					if (!found) {
						console.log('ERROR: channel ' + channelNames[i] + ' does not exist');
						return Promise.reject();
					}
				}
				if (channelNames.length > 0) {
					console.log(' - verify channels');
				}

				for (var i = 0; i < typeNames.length; i++) {
					contentTypes.push({
						name: typeNames[i]
					});
				}

				return serverRest.createRepository({
					server: server,
					name: name,
					description: desc,
					defaultLanguage: defaultLanguage,
					contentTypes: contentTypes,
					channels: channels
				});
			})
			.then(function (result) {
				if (result.err) {
					return Promise.reject();
				}
				// console.log(result);
				console.log(' - repository ' + name + ' created');

				done(true);
			})
			.catch((error) => {
				done();
			});
	});
};

module.exports.controlRepository = function (argv, done) {
	'use strict';

	if (!verifyRun(argv)) {
		done();
		return;
	}

	var serverName = argv.server;
	var server = serverUtils.verifyServer(serverName, projectDir);
	if (!server || !server.valid) {
		done();
		return;
	}
	console.log(' - server: ' + server.url);

	var action = argv.action;
	var name = argv.repository;
	var repoNames = argv.repository ? argv.repository.split(',') : [];
	var typeNames = argv.contenttypes ? argv.contenttypes.split(',') : [];
	var channelNames = argv.channels ? argv.channels.split(',') : [];
	var taxNames = argv.taxonomies ? argv.taxonomies.split(',') : [];

	var allRepos = [];
	var allRepoNames = [];
	var channels = [];
	var types = [];
	var taxonomies = [];
	var finalTypeNames = [];
	var finaleChannelNames = [];
	var finalTaxNames = [];

	serverUtils.loginToServer(server, serverUtils.getRequest()).then(function (result) {
		if (!result.status) {
			console.log(' - failed to connect to the server');
			done();
			return;
		}

		serverRest.getRepositories({
				server: server
			})
			.then(function (result) {
				if (result.err) {
					return Promise.reject();
				}
				// get repositories
				var repositories = result || [];
				repoNames.forEach(function (name) {
					var found = false;
					for (var i = 0; i < repositories.length; i++) {
						if (name.toLowerCase() === repositories[i].name.toLowerCase()) {
							allRepos.push(repositories[i]);
							allRepoNames.push(name);
							found = true;
							break;
						}
					}
					if (!found) {
						console.log('ERROR: repository ' + name + ' does not exist');
					}
				});
				if (allRepos.length === 0) {
					return Promise.reject();
				}
				console.log(' - verify ' + (allRepos.length === 1 ? 'repository' : 'repositories'));

				var typePromises = [];
				for (var i = 0; i < typeNames.length; i++) {
					typePromises.push(serverRest.getContentType({
						server: server,
						name: typeNames[i]
					}));
				}

				return Promise.all(typePromises);
			})
			.then(function (results) {
				var allTypes = results || [];
				for (var i = 0; i < typeNames.length; i++) {
					for (var j = 0; j < allTypes.length; j++) {
						if (allTypes[j].name && typeNames[i].toLowerCase() === allTypes[j].name.toLowerCase()) {
							types.push({
								name: allTypes[j].name
							});
							finalTypeNames.push(typeNames[i]);
							break;
						}
					}
				}
				// console.log(types);

				if (typeNames.length > 0) {
					if (types.length === 0) {
						return Promise.reject();
					}
					console.log(' - verify content types');
				}

				// get channels
				var channelPromises = [];
				if (channelNames.length > 0) {
					channelPromises.push(serverRest.getChannels({
						server: server
					}));
				}

				return Promise.all(channelPromises);
			})
			.then(function (results) {
				var allChannels = results.length > 0 ? results[0] : [];
				for (var i = 0; i < channelNames.length; i++) {
					var found = false;
					for (var j = 0; j < allChannels.length; j++) {
						if (channelNames[i].toLowerCase() === allChannels[j].name.toLowerCase()) {
							found = true;
							channels.push({
								id: allChannels[j].id,
								name: allChannels[j].name
							});
							finaleChannelNames.push(channelNames[i]);
							break;
						}
					}
					if (!found) {
						console.log('ERROR: channel ' + channelNames[i] + ' does not exist');
					}
				}
				if (channelNames.length > 0) {
					if (channels.length === 0) {
						return Promise.reject();
					}
					console.log(' - verify channels');
				}

				// get taxonomies
				var taxPromises = [];
				if (taxNames.length > 0) {
					taxPromises.push(serverRest.getTaxonomies({
						server: server
					}));
				}

				return Promise.all(taxPromises);
			})
			.then(function (results) {
				var allTaxonomies = results.length > 0 ? results[0] : [];
				for (var i = 0; i < taxNames.length; i++) {
					var found = false;
					var foundPromoted = false;
					for (var j = 0; j < allTaxonomies.length; j++) {
						if (taxNames[i].toLowerCase() === allTaxonomies[j].name.toLowerCase()) {
							found = true;
							var availableStates = allTaxonomies[j].availableStates || [];
							availableStates.forEach(function (state) {
								if (state.status === 'promoted') {
									foundPromoted = true;
								}
							});

							if (foundPromoted) {
								taxonomies.push({
									id: allTaxonomies[j].id,
									name: allTaxonomies[j].name,
									shortName: allTaxonomies[j].shortName
								});
								finalTaxNames.push(taxNames[i]);
							}
							break;
						}
					}
					if (!found) {
						console.log('ERROR: taxonomy ' + taxNames[i] + ' does not exist');
						// return Promise.reject();
					} else if (!foundPromoted) {
						console.log('ERROR: taxonomy ' + taxNames[i] + ' does not have promoted version');
						// return Promise.reject();
					}
				}
				if (finalTaxNames.length > 0) {
					console.log(' - verify ' + (finalTaxNames.length > 1 ? 'taxonomies' : 'taxonomy'));
				} else if (taxNames.length > 0) {
					return Promise.reject();
				}

				return _controlRepositories(server, allRepos, action, types, finalTypeNames,
					channels, finaleChannelNames, taxonomies, finalTaxNames);

			})
			.then(function (result) {

				done(true);
			})
			.catch((error) => {
				done();
			});
	});
};

var _controlRepositories = function (server, repositories, action, types, typeNames,
	channels, channelNames, taxonomies, taxonomyNames) {
	return new Promise(function (resolve, reject) {
		var startTime;
		var doUpdateRepos = repositories.reduce(function (updatePromise, repository) {
				var name = repository.name;

				return updatePromise.then(function (result) {
					var finalTypes = repository.contentTypes;
					var finalChannels = repository.channels;
					var finalTaxonomies = repository.taxonomies;
					var idx;

					if (action === 'add-type') {
						finalTypes = finalTypes.concat(types);
					} else if (action === 'remove-type') {
						for (var i = 0; i < typeNames.length; i++) {
							idx = undefined;
							for (var j = 0; j < finalTypes.length; j++) {
								if (typeNames[i].toLowerCase() === finalTypes[j].name.toLowerCase()) {
									idx = j;
									break;
								}
							}
							if (idx !== undefined) {
								finalTypes.splice(idx, 1);
							}
						}
					} else if (action === 'add-channel') {
						finalChannels = finalChannels.concat(channels);
					} else if (action === 'remove-channel') {
						for (var i = 0; i < channels.length; i++) {
							idx = undefined;
							for (var j = 0; j < finalChannels.length; j++) {
								if (channels[i].id === finalChannels[j].id) {
									idx = j;
									break;
								}
							}
							if (idx !== undefined) {
								finalChannels.splice(idx, 1);
							}
						}
					} else if (action === 'add-taxonomy') {

						finalTaxonomies = finalTaxonomies.concat(taxonomies);

					} else if (action === 'remove-taxonomy') {
						for (var i = 0; i < taxonomies.length; i++) {
							idx = undefined;
							for (var j = 0; j < finalTaxonomies.length; j++) {
								if (taxonomies[i].id === finalTaxonomies[j].id) {
									idx = j;
									break;
								}
							}
							if (idx !== undefined) {
								finalTaxonomies.splice(idx, 1);
							}
						}
					}

					serverRest.updateRepository({
						server: server,
						repository: repository,
						contentTypes: finalTypes,
						channels: finalChannels,
						taxonomies: finalTaxonomies
					}).then(function (result) {
						if (result.err) {

						} else {
							if (action === 'add-type') {
								console.log(' - added type ' + typeNames + ' to repository ' + name);
							} else if (action === 'remove-type') {
								console.log(' - removed type ' + typeNames + ' from repository ' + name);
							} else if (action === 'add-channel') {
								console.log(' - added channel ' + channelNames + ' to repository ' + name);
							} else if (action === 'remove-channel') {
								console.log(' - removed channel ' + channelNames + ' from repository ' + name);
							} else if (action === 'add-taxonomy') {
								console.log(' - added taxonomy ' + taxonomyNames + ' to repository ' + name);
							} else if (action === 'remove-taxonomy') {
								console.log(' - removed taxonomy ' + taxonomyNames + ' from repository ' + name);
							}
						}
					});

				});
			},
			Promise.resolve({})
		);

		doUpdateRepos.then(function (result) {
			resolve(result);
		});
	});
};


module.exports.shareRepository = function (argv, done) {
	'use strict';

	if (!verifyRun(argv)) {
		done();
		return;
	}

	var serverName = argv.server;
	var server = serverUtils.verifyServer(serverName, projectDir);
	if (!server || !server.valid) {
		done();
		return;
	}
	console.log(' - server: ' + server.url);

	var name = argv.name;
	var userNames = argv.users ? argv.users.split(',') : [];
	var groupNames = argv.groups ? argv.groups.split(',') : [];
	var role = argv.role;
	var shareTypes = typeof argv.types === 'string' && argv.types.toLowerCase() === 'true';
	var typeRole = argv.typerole || role;

	var repository;
	var users = [];
	var groups = [];
	var goodUserName = [];
	var goodGroupNames = [];
	var typeNames = [];
	var usersToGrant = [];
	var groupsToGrant = [];

	serverUtils.loginToServer(server, serverUtils.getRequest()).then(function (result) {
		if (!result.status) {
			console.log(' - failed to connect to the server');
			done();
			return;
		}

		serverRest.getRepositories({
				server: server
			})
			.then(function (result) {
				if (result.err) {
					return Promise.reject();
				}
				// get repositories
				var repositories = result || [];
				for (var i = 0; i < repositories.length; i++) {
					if (name.toLowerCase() === repositories[i].name.toLowerCase()) {
						repository = repositories[i];
						break;
					}
				}
				if (!repository) {
					console.log('ERROR: repository ' + name + ' does not exist');
					return Promise.reject();
				}
				console.log(' - verify repository');

				if (repository.contentTypes) {
					for (var i = 0; i < repository.contentTypes.length; i++) {
						typeNames.push(repository.contentTypes[i].name);
					}
				}
				if (shareTypes) {
					if (typeNames.length === 0) {
						console.log(' - no content types in the repository');
					} else {
						console.log(' - repository includes content type ' + typeNames.join(', '));
					}
				}

				var groupPromises = [];
				groupNames.forEach(function (gName) {
					groupPromises.push(
						serverRest.getGroup({
							server: server,
							name: gName
						}));
				});
				return Promise.all(groupPromises);
			})
			.then(function (result) {

				if (groupNames.length > 0) {
					console.log(' - verify groups');

					// verify groups
					var allGroups = result || [];
					for (var i = 0; i < groupNames.length; i++) {
						var found = false;
						for (var j = 0; j < allGroups.length; j++) {
							if (allGroups[j].name && groupNames[i].toLowerCase() === allGroups[j].name.toLowerCase()) {
								found = true;
								groups.push(allGroups[j]);
								break;
							}
						}
						if (!found) {
							console.log('ERROR: group ' + groupNames[i] + ' does not exist');
							// return Promise.reject();
						}
					}
				}

				var usersPromises = [];
				for (var i = 0; i < userNames.length; i++) {
					usersPromises.push(serverRest.getUser({
						server: server,
						name: userNames[i]
					}));
				}

				return Promise.all(usersPromises);
			})
			.then(function (results) {
				var allUsers = [];
				for (var i = 0; i < results.length; i++) {
					if (results[i].items) {
						allUsers = allUsers.concat(results[i].items);
					}
				}
				if (userNames.length > 0) {
					console.log(' - verify users');
				}
				// verify users
				for (var k = 0; k < userNames.length; k++) {
					var found = false;
					for (var i = 0; i < allUsers.length; i++) {
						if (allUsers[i].loginName.toLowerCase() === userNames[k].toLowerCase()) {
							users.push(allUsers[i]);
							found = true;
							break;
						}
						if (found) {
							break;
						}
					}
					if (!found) {
						console.log('ERROR: user ' + userNames[k] + ' does not exist');
					}
				}

				if (users.length === 0 && groups.length === 0) {
					return Promise.reject();
				}

				return serverRest.getResourcePermissions({
					server: server,
					id: repository.id,
					type: 'repository'
				});
			})
			.then(function (result) {
				if (!result || result.err) {
					return Promise.reject();
				}

				var existingPermissions = result && result.permissions || [];
				// console.log(existingPermissions);

				for (var i = 0; i < groups.length; i++) {
					var groupGranted = false;
					for (var j = 0; j < existingPermissions.length; j++) {
						var perm = existingPermissions[j];
						if (perm.roleName === role && perm.type === 'group' &&
							perm.groupType === groups[i].groupOriginType && perm.fullName === groups[i].name) {
							groupGranted = true;
							break;
						}
					}
					if (groupGranted) {
						console.log(' - group ' + groups[i].name + ' already granted with role ' + role + ' on repository ' + name);
					} else {
						groupsToGrant.push(groups[i]);
						goodGroupNames.push(groups[i].name);
					}
				}

				for (var i = 0; i < users.length; i++) {
					var granted = false;
					for (var j = 0; j < existingPermissions.length; j++) {
						var perm = existingPermissions[j];
						if (perm.roleName === role && perm.type === 'user' && perm.id === users[i].loginName) {
							granted = true;
							break;
						}
					}
					if (granted) {
						console.log(' - user ' + users[i].loginName + ' already granted with role ' + role + ' on repository ' + name);
					} else {
						usersToGrant.push(users[i]);
						goodUserName.push(users[i].loginName);
					}
				}

				return serverRest.performPermissionOperation({
					server: server,
					operation: 'share',
					resourceId: repository.id,
					resourceType: 'repository',
					role: role,
					users: usersToGrant,
					groups: groupsToGrant
				});
			})
			.then(function (result) {
				if (result.err) {
					return Promise.reject();
				}

				if (goodUserName.length > 0) {
					console.log(' - user ' + (goodUserName.join(', ')) + ' granted with role ' + role + ' on repository ' + name);
				}

				if (goodGroupNames.length > 0) {
					console.log(' - group ' + (goodGroupNames.join(', ')) + ' granted with role ' + role + ' on repository ' + name);
				}

				if (shareTypes && typeNames.length > 0) {
					var goodTypeNames = [];
					var typePromises = [];
					for (var i = 0; i < typeNames.length; i++) {
						typePromises.push(serverRest.getContentType({
							server: server,
							name: typeNames[i]
						}));
					}
					var success = true;

					Promise.all(typePromises).then(function (results) {
							for (var i = 0; i < results.length; i++) {
								if (results[i].id) {
									goodTypeNames.push(results[i].name);
								}
							}

							if (goodTypeNames.length === 0) {
								return Promise.reject();
							}

							var typePermissionPromises = [];
							for (var i = 0; i < goodTypeNames.length; i++) {
								typePermissionPromises.push(serverRest.getResourcePermissions({
									server: server,
									id: goodTypeNames[i],
									type: 'type'
								}));
							}

							Promise.all(typePermissionPromises)
								.then(function (results) {
									var shareTypePromises = [];

									for (var i = 0; i < results.length; i++) {
										var resource = results[i].resource;
										var perms = results[i] && results[i].permissions || [];
										var typeUsersToGrant = [];
										var typeGroupsToGrant = [];

										groups.forEach(function (group) {
											var granted = false;
											for (var j = 0; j < perms.length; j++) {
												if (perms[j].roleName === typeRole && perms[j].fullName === group.name &&
													perms[j].type === 'group' && perms[j].groupType === group.groupOriginType) {
													granted = true;
													break;
												}
											}
											if (granted) {
												console.log(' - group ' + group.name + ' already granted with role ' + typeRole + ' on type ' + resource);
											} else {
												typeGroupsToGrant.push(group);
											}
										});

										users.forEach(function (user) {
											var granted = false;
											for (var j = 0; j < perms.length; j++) {
												if (perms[j].roleName === typeRole && perms[j].type === 'user' && perms[j].id === user.loginName) {
													granted = true;
													break;
												}
											}
											if (granted) {
												console.log(' - user ' + user.loginName + ' already granted with role ' + typeRole + ' on type ' + resource);
											} else {
												typeUsersToGrant.push(user);
											}
										});

										shareTypePromises.push(serverRest.performPermissionOperation({
											server: server,
											operation: 'share',
											resourceName: resource,
											resourceType: 'type',
											role: typeRole,
											users: typeUsersToGrant,
											groups: typeGroupsToGrant
										}));
									}

									return Promise.all(shareTypePromises);
								})
								.then(function (results) {

									for (var i = 0; i < results.length; i++) {
										if (results[i].operations) {
											var obj = results[i].operations.share;
											var resourceName = obj.resource && obj.resource.name;
											var grants = obj.roles && obj.roles[0] && obj.roles[0].users || [];
											var userNames = [];
											var groupNames = [];
											grants.forEach(function (grant) {
												if (grant.type === 'group') {
													groupNames.push(grant.name);
												} else {
													userNames.push(grant.name);
												}
											});
											if (userNames.length > 0 || groupNames.length > 0) {
												var msg = ' -';
												if (userNames.length > 0) {
													msg = msg + ' user ' + userNames.join(', ');
												}
												if (groupNames.length > 0) {
													msg = msg + ' group ' + groupNames.join(', ');
												}
												msg = msg + ' granted with role ' + typeRole + ' on type ' + resourceName;
												console.log(msg);
											}
										}
									}

									done(true);

								});
						})
						.catch((error) => {
							done(success);
						});
				} else {
					done(true);
				}

			})
			.catch((error) => {
				done();
			});
	});
};


module.exports.unShareRepository = function (argv, done) {
	'use strict';

	if (!verifyRun(argv)) {
		done();
		return;
	}

	var serverName = argv.server;
	var server = serverUtils.verifyServer(serverName, projectDir);
	if (!server || !server.valid) {
		done();
		return;
	}
	console.log(' - server: ' + server.url);

	var name = argv.name;
	var userNames = argv.users ? argv.users.split(',') : [];
	var groupNames = argv.groups ? argv.groups.split(',') : [];
	var unshareTypes = typeof argv.types === 'string' && argv.types.toLowerCase() === 'true';

	var repository;
	var users = [];
	var groups = [];
	var goodUserName = [];
	var goodGroupNames = [];
	var typeNames = [];

	serverUtils.loginToServer(server, serverUtils.getRequest()).then(function (result) {
		if (!result.status) {
			console.log(' - failed to connect to the server');
			done();
			return;
		}

		serverRest.getRepositories({
				server: server
			})
			.then(function (result) {
				if (result.err) {
					return Promise.reject();
				}
				// get repositories
				var repositories = result || [];
				for (var i = 0; i < repositories.length; i++) {
					if (name.toLowerCase() === repositories[i].name.toLowerCase()) {
						repository = repositories[i];
						break;
					}
				}
				if (!repository) {
					console.log('ERROR: repository ' + name + ' does not exist');
					return Promise.reject();
				}
				console.log(' - verify repository');

				if (repository.contentTypes) {
					for (var i = 0; i < repository.contentTypes.length; i++) {
						typeNames.push(repository.contentTypes[i].name);
					}
				}
				if (unshareTypes) {
					if (typeNames.length === 0) {
						console.log(' - no content types in the repository');
					} else {
						console.log(' - repository includes content type ' + typeNames.join(', '));
					}
				}

				var groupPromises = [];
				groupNames.forEach(function (gName) {
					groupPromises.push(
						serverRest.getGroup({
							server: server,
							name: gName
						}));
				});
				return Promise.all(groupPromises);

			})
			.then(function (result) {

				if (groupNames.length > 0) {
					console.log(' - verify groups');

					// verify groups
					var allGroups = result || [];
					for (var i = 0; i < groupNames.length; i++) {
						var found = false;
						for (var j = 0; j < allGroups.length; j++) {
							if (allGroups[j].name && groupNames[i].toLowerCase() === allGroups[j].name.toLowerCase()) {
								found = true;
								groups.push(allGroups[j]);
								goodGroupNames.push(groupNames[i]);
								break;
							}
						}
						if (!found) {
							console.log('ERROR: group ' + groupNames[i] + ' does not exist');
							// return Promise.reject();
						}
					}
				}

				var usersPromises = [];
				for (var i = 0; i < userNames.length; i++) {
					usersPromises.push(serverRest.getUser({
						server: server,
						name: userNames[i]
					}));
				}

				return Promise.all(usersPromises);
			})
			.then(function (results) {
				var allUsers = [];
				for (var i = 0; i < results.length; i++) {
					if (results[i].items) {
						allUsers = allUsers.concat(results[i].items);
					}
				}
				if (userNames.length > 0) {
					console.log(' - verify users');
				}

				// verify users
				for (var k = 0; k < userNames.length; k++) {
					var found = false;
					for (var i = 0; i < allUsers.length; i++) {
						if (allUsers[i].loginName.toLowerCase() === userNames[k].toLowerCase()) {
							users.push(allUsers[i]);
							goodUserName.push(userNames[k]);
							found = true;
							break;
						}
						if (found) {
							break;
						}
					}
					if (!found) {
						console.log('ERROR: user ' + userNames[k] + ' does not exist');
					}
				}

				if (users.length === 0 && groups.length === 0) {
					return Promise.reject();
				}

				return serverRest.performPermissionOperation({
					server: server,
					operation: 'unshare',
					resourceId: repository.id,
					resourceType: 'repository',
					users: users,
					groups: groups
				});
			})
			.then(function (result) {
				if (result.err) {
					return Promise.reject();
				}

				if (goodUserName.length > 0) {
					console.log(' - the access of user ' + (goodUserName.join(', ')) + ' to repository ' + name + ' removed');
				}
				if (goodGroupNames.length > 0) {
					console.log(' - the access of group ' + (goodGroupNames.join(', ')) + ' to repository ' + name + ' removed');
				}

				if (unshareTypes && typeNames.length > 0) {
					var typePromises = [];
					for (var i = 0; i < typeNames.length; i++) {
						typePromises.push(serverRest.getContentType({
							server: server,
							name: typeNames[i]
						}));
					}
					Promise.all(typePromises).then(function (results) {
							var shareTypePromises = [];
							for (var i = 0; i < results.length; i++) {
								if (results[i].id) {
									shareTypePromises.push(serverRest.performPermissionOperation({
										server: server,
										operation: 'unshare',
										resourceName: results[i].name,
										resourceType: 'type',
										users: users,
										groups: groups
									}));
								}
							}
							return Promise.all(shareTypePromises);
						})
						.then(function (results) {
							var unsharedTypes = [];
							for (var i = 0; i < results.length; i++) {
								var obj = results[i].operations.unshare;
								if (obj.resource && obj.resource.name) {
									unsharedTypes.push(obj.resource.name);
								}
							}
							if (unsharedTypes.length > 0) {
								if (goodUserName.length > 0) {
									console.log(' - the access of user ' + (goodUserName.join(', ')) + ' to type ' + unsharedTypes.join(', ') + ' removed');
								}
								if (goodGroupNames.length > 0) {
									console.log(' - the access of group ' + (goodGroupNames.join(', ')) + ' to type ' + unsharedTypes.join(', ') + ' removed');
								}
							}
							done(true);
						});
				} else {
					done(true);
				}
			})
			.catch((error) => {
				done();
			});
	});
};

module.exports.shareType = function (argv, done) {
	'use strict';

	if (!verifyRun(argv)) {
		done();
		return;
	}

	var serverName = argv.server;
	var server = serverUtils.verifyServer(serverName, projectDir);

	if (!server || !server.valid) {
		done();
		return;
	}

	console.log(' - server: ' + server.url);

	var name = argv.name;
	var userNames = argv.users ? argv.users.split(',') : [];
	var groupNames = argv.groups ? argv.groups.split(',') : [];
	var role = argv.role;

	var users = [];
	var groups = [];
	var goodUserName = [];
	var goodGroupNames = [];

	serverUtils.loginToServer(server, serverUtils.getRequest()).then(function (result) {
		if (!result.status) {
			console.log(' - failed to connect to the server');
			done();
			return;
		}

		serverRest.getContentType({
				server: server,
				name: name
			}).then(function (result) {
				if (result.err) {
					return Promise.reject();
				}

				console.log(' - verify type');

				var groupPromises = [];
				groupNames.forEach(function (gName) {
					groupPromises.push(
						serverRest.getGroup({
							server: server,
							name: gName
						}));
				});
				return Promise.all(groupPromises);

			})
			.then(function (result) {

				if (groupNames.length > 0) {
					console.log(' - verify groups');

					// verify groups
					var allGroups = result || [];
					for (var i = 0; i < groupNames.length; i++) {
						var found = false;
						for (var j = 0; j < allGroups.length; j++) {
							if (allGroups[j].name && groupNames[i].toLowerCase() === allGroups[j].name.toLowerCase()) {
								found = true;
								groups.push(allGroups[j]);
								break;
							}
						}
						if (!found) {
							console.log('ERROR: group ' + groupNames[i] + ' does not exist');
						}
					}
				}

				var usersPromises = [];
				for (var i = 0; i < userNames.length; i++) {
					usersPromises.push(serverRest.getUser({
						server: server,
						name: userNames[i]
					}));
				}

				return Promise.all(usersPromises);
			})
			.then(function (results) {
				var allUsers = [];
				for (var i = 0; i < results.length; i++) {
					if (results[i].items) {
						allUsers = allUsers.concat(results[i].items);
					}
				}
				if (userNames.length > 0) {
					console.log(' - verify users');
				}

				// verify users
				for (var k = 0; k < userNames.length; k++) {
					var found = false;
					for (var i = 0; i < allUsers.length; i++) {
						if (allUsers[i].loginName.toLowerCase() === userNames[k].toLowerCase()) {
							users.push(allUsers[i]);
							found = true;
							break;
						}
						if (found) {
							break;
						}
					}
					if (!found) {
						console.log('ERROR: user ' + userNames[k] + ' does not exist');
					}
				}

				if (users.length === 0 && groups.length === 0) {
					return Promise.reject();
				}

				return serverRest.getResourcePermissions({
					server: server,
					id: name,
					type: 'type'
				});
			})
			.then(function (result) {
				if (!result || result.err) {
					return Promise.reject();
				}

				var existingPermissions = result && result.permissions || [];
				var i, j;
				var groupsToGrant = [];
				for (i = 0; i < groups.length; i++) {
					var groupGranted = false;
					for (j = 0; j < existingPermissions.length; j++) {
						var perm = existingPermissions[j];
						if (perm.roleName === role && perm.type === 'group' &&
							perm.groupType === groups[i].groupOriginType && perm.fullName === groups[i].name) {
							groupGranted = true;
							break;
						}
					}
					if (groupGranted) {
						console.log(' - group ' + groups[i].name + ' already granted with role ' + role + ' on type ' + name);
					} else {
						groupsToGrant.push(groups[i]);
						goodGroupNames.push(groups[i].name);
					}
				}

				var usersToGrant = [];
				for (i = 0; i < users.length; i++) {
					var granted = false;
					for (j = 0; j < existingPermissions.length; j++) {
						var perm = existingPermissions[j];
						if (perm.roleName === role && perm.type === 'user' && perm.id === users[i].loginName) {
							granted = true;
							break;
						}
					}
					if (granted) {
						console.log(' - user ' + users[i].loginName + ' already granted with role ' + role + ' on type ' + name);
					} else {
						usersToGrant.push(users[i]);
						goodUserName.push(users[i].loginName);
					}
				}

				return serverRest.performPermissionOperation({
					server: server,
					operation: 'share',
					resourceName: name,
					resourceType: 'type',
					role: role,
					users: usersToGrant,
					groups: groupsToGrant
				});
			})
			.then(function (result) {
				if (result.err) {
					return Promise.reject();
				}
				if (goodUserName.length > 0) {
					console.log(' - user ' + (goodUserName.join(', ')) + ' granted with role ' + role + ' on type ' + name);
				}
				if (goodGroupNames.length > 0) {
					console.log(' - group ' + (goodGroupNames.join(', ')) + ' granted with role ' + role + ' on type ' + name);
				}
				done(true);
			})
			.catch((error) => {
				done();
			});
	});
};

module.exports.unshareType = function (argv, done) {
	'use strict';

	if (!verifyRun(argv)) {
		done();
		return;
	}

	var serverName = argv.server;
	var server = serverUtils.verifyServer(serverName, projectDir);

	if (!server || !server.valid) {
		done();
		return;
	}

	console.log(' - server: ' + server.url);

	var name = argv.name;
	var userNames = argv.users ? argv.users.split(',') : [];
	var groupNames = argv.groups ? argv.groups.split(',') : [];

	var users = [];
	var groups = [];
	var goodUserName = [];
	var goodGroupNames = [];

	serverUtils.loginToServer(server, serverUtils.getRequest()).then(function (result) {
		if (!result.status) {
			console.log(' - failed to connect to the server');
			done();
			return;
		}

		serverRest.getContentType({
				server: server,
				name: name
			}).then(function (result) {
				if (result.err) {
					return Promise.reject();
				}

				var groupPromises = [];
				groupNames.forEach(function (gName) {
					groupPromises.push(
						serverRest.getGroup({
							server: server,
							name: gName
						}));
				});
				return Promise.all(groupPromises);

			})
			.then(function (result) {

				if (groupNames.length > 0) {
					console.log(' - verify groups');

					// verify groups
					var allGroups = result || [];
					for (var i = 0; i < groupNames.length; i++) {
						var found = false;
						for (var j = 0; j < allGroups.length; j++) {
							if (allGroups[j].name && groupNames[i].toLowerCase() === allGroups[j].name.toLowerCase()) {
								found = true;
								groups.push(allGroups[j]);
								goodGroupNames.push(groupNames[i]);
								break;
							}
						}
						if (!found) {
							console.log('ERROR: group ' + groupNames[i] + ' does not exist');
						}
					}
				}

				var usersPromises = [];
				for (var i = 0; i < userNames.length; i++) {
					usersPromises.push(serverRest.getUser({
						server: server,
						name: userNames[i]
					}));
				}

				return Promise.all(usersPromises);
			})
			.then(function (results) {
				var allUsers = [];
				for (var i = 0; i < results.length; i++) {
					if (results[i].items) {
						allUsers = allUsers.concat(results[i].items);
					}
				}
				if (userNames.length > 0) {
					console.log(' - verify users');
				}

				// verify users
				for (var k = 0; k < userNames.length; k++) {
					var found = false;
					for (var i = 0; i < allUsers.length; i++) {
						if (allUsers[i].loginName.toLowerCase() === userNames[k].toLowerCase()) {
							users.push(allUsers[i]);
							goodUserName.push(userNames[k]);
							found = true;
							break;
						}
						if (found) {
							break;
						}
					}
					if (!found) {
						console.log('ERROR: user ' + userNames[k] + ' does not exist');
					}
				}

				if (users.length === 0 && groups.length === 0) {
					return Promise.reject();
				}

				return serverRest.performPermissionOperation({
					server: server,
					operation: 'unshare',
					resourceName: name,
					resourceType: 'type',
					users: users,
					groups: groups
				});
			})
			.then(function (result) {
				if (result.err) {
					return Promise.reject();
				}

				if (goodUserName.length > 0) {
					console.log(' - the access of user ' + (goodUserName.join(', ')) + ' to type ' + name + ' removed');
				}
				if (goodGroupNames.length > 0) {
					console.log(' - the access of group ' + (goodGroupNames.join(', ')) + ' to type ' + name + ' removed');
				}
				done(true);
			})
			.catch((error) => {
				done();
			});
	});
};

module.exports.downloadType = function (argv, done) {
	'use strict';

	if (!verifyRun(argv)) {
		done();
		return;
	}

	var serverName = argv.server;
	var server = serverUtils.verifyServer(serverName, projectDir);

	if (!server || !server.valid) {
		done();
		return;
	}

	console.log(' - server: ' + server.url);

	var names = argv.name.split(',');
	var goodNames = [];
	var types = [];

	var customEditors = [];
	var customForms = [];

	serverUtils.loginToServer(server, serverUtils.getRequest()).then(function (result) {
		if (!result.status) {
			console.log(' - failed to connect to the server');
			done();
			return;
		}

		var typepromises = [];
		names.forEach(function (name) {
			typepromises.push(serverRest.getContentType({
				server: server,
				name: name,
				expand: 'all'
			}));
		});

		Promise.all(typepromises)
			.then(function (results) {
				var allTypes = results || [];

				for (var i = 0; i < names.length; i++) {
					var found = false;
					for (var j = 0; j < allTypes.length; j++) {
						if (names[i] === allTypes[j].name && !goodNames.includes(names[i])) {
							found = true;
							goodNames.push(names[i]);
							types.push(allTypes[j]);
							break;
						}
					}
				}

				if (types.length === 0) {
					return Promise.reject();
				}

				// save types to local
				if (!fs.existsSync(typesSrcDir)) {
					fs.mkdirSync(typesSrcDir);
				}

				types.forEach(function (typeObj) {
					var folderPath = path.join(typesSrcDir, typeObj.name);
					if (!fs.existsSync(folderPath)) {
						fs.mkdirSync(folderPath);
					}

					var filePath = path.join(folderPath, typeObj.name + '.json');
					fs.writeFileSync(filePath, JSON.stringify(typeObj, null, 4));

					console.log(' - save type ' + filePath);

					var typeCustomEditors = typeObj.properties && typeObj.properties.customEditors || [];
					for (var i = 0; i < typeCustomEditors.length; i++) {
						if (!customEditors.includes(typeCustomEditors[i])) {
							customEditors.push(typeCustomEditors[i]);
						}
					}
					var typeCustomForms = typeObj.properties && typeObj.properties.customForms || [];
					for (var i = 0; i < typeCustomForms.length; i++) {
						if (!customForms.includes(typeCustomForms[i])) {
							customForms.push(typeCustomForms[i]);
						}
					}

				});

				if (customEditors.length > 0) {
					console.log(' - will download content field editor ' + customEditors.join(', '));
				}
				if (customForms.length > 0) {
					console.log(' - will download content form ' + customForms.join(', '));
				}

				if (customEditors.length === 0 && customForms.length === 0) {
					done(true);
				} else {
					componentUtils.downloadComponents(server, customEditors.concat(customForms), argv)
						.then(function (result) {
							done(result.err ? false : true);
						});
				}
			})
			.catch((error) => {
				done();
			});
	});

};


module.exports.uploadType = function (argv, done) {
	'use strict';

	if (!verifyRun(argv)) {
		done();
		return;
	}

	var serverName = argv.server;
	var server = serverUtils.verifyServer(serverName, projectDir);

	if (!server || !server.valid) {
		done();
		return;
	}

	console.log(' - server: ' + server.url);

	var allNames = argv.name.split(',');
	var names = [];
	var comps = [];
	var customEditors = [];
	var customForms = [];

	// varify the types on local
	allNames.forEach(function (name) {
		var filePath = path.join(typesSrcDir, name, name + '.json');
		if (!fs.existsSync(filePath)) {
			console.log('ERROR: type ' + name + ' does not exist');
		} else if (!names.includes(name)) {
			names.push(name);
			var typeObj = JSON.parse(fs.readFileSync(filePath));
			var typeCustomEditors = typeObj.properties && typeObj.properties.customEditors || [];
			for (var i = 0; i < typeCustomEditors.length; i++) {
				if (!customEditors.includes(typeCustomEditors[i])) {
					customEditors.push(typeCustomEditors[i]);
					comps.push(typeCustomEditors[i]);
				}
			}
			var typeCustomForms = typeObj.properties && typeObj.properties.customForms || [];
			for (var i = 0; i < typeCustomForms.length; i++) {
				if (!customForms.includes(typeCustomForms[i])) {
					customForms.push(typeCustomForms[i]);
					comps.push(typeCustomForms[i]);
				}
			}
		}
	});

	if (names.length === 0) {
		// no type to upload
		done();
		return;
	}

	var typesToCreate = [];
	var typesToUpdate = [];

	var hasError = false;

	serverUtils.loginToServer(server, serverUtils.getRequest()).then(function (result) {
		if (!result.status) {
			console.log(' - failed to connect to the server');
			done();
			return;
		}

		if (customEditors.length > 0) {
			console.log(' - will upload content field editor ' + customEditors.join(', '));
		}
		if (customForms.length > 0) {
			console.log(' - will upload content form ' + customForms.join(', '));
		}

		_uploadTypeComponents(server, comps)
			.then(function (result) {

				var typepromises = [];
				names.forEach(function (name) {
					typepromises.push(serverRest.getContentType({
						server: server,
						name: name,
						showError: false
					}));
				});

				return Promise.all(typepromises);
			})
			.then(function (results) {
				var allTypes = results || [];

				for (var i = 0; i < names.length; i++) {
					var found = false;
					for (var j = 0; j < allTypes.length; j++) {
						if (names[i] === allTypes[j].name) {
							found = true;
							break;
						}
					}
					if (found) {
						typesToUpdate.push(names[i]);
					} else {
						typesToCreate.push(names[i]);
					}
				}

				if (typesToCreate.length > 0) {
					console.log(' - will create type ' + typesToCreate.join(', '));
				}
				if (typesToUpdate.length > 0) {
					console.log(' - will update type ' + typesToUpdate.join(', '));
				}

				return _createContentTypes(server, typesToCreate);
			})
			.then(function (results) {
				// console.log(results);
				var createdTypes = results || [];
				createdTypes.forEach(function (createdType) {
					if (createdType.id) {
						console.log(' - type ' + createdType.name + ' created');
					}
					if (createdType.err) {
						hasError = true;
					}
				});

				var updateTypePromises = [];
				typesToUpdate.forEach(function (name) {
					var filePath = path.join(typesSrcDir, name, name + '.json');
					var typeObj;
					try {
						typeObj = JSON.parse(fs.readFileSync(filePath));
					} catch (e) {
						console.log(e);
					}
					if (typeObj && typeObj.name) {
						updateTypePromises.push(serverRest.updateContentType({
							server: server,
							type: typeObj
						}));
					}
				});

				return Promise.all(updateTypePromises);
			})
			.then(function (results) {
				var updatedTypes = results || [];
				updatedTypes.forEach(function (updatedType) {
					if (updatedType.id) {
						console.log(' - type ' + updatedType.name + ' updated');
					}
					if (updatedType.err) {
						hasError = true;
					}
				});

				done(!hasError);
			})
			.catch((error) => {
				done();
			});
	});

};

var _uploadTypeComponents = function (server, comps) {

	return new Promise(function (resolve, reject) {
		if (comps.length === 0) {
			return resolve({});
		} else {
			var argv = {
				projectDir: projectDir,
				component: comps.join(','),
				noOptimize: true
			};
			componentUtils.exportComponents(argv)
				.then(function (result) {
					var folder = 'Home';
					var folderId = 'self';
					var publish = true;

					var importsPromise = [];
					for (var i = 0; i < comps.length; i++) {
						var name = comps[i];
						var zipfile = path.join(projectDir, "dist", name) + ".zip";

						importsPromise.push(componentUtils.uploadComponent(server, folder, folderId, zipfile, name, publish));
					}
					return Promise.all(importsPromise);
				})
				.then(function (results) {
					// console.log(results);
					var files = results || [];
					var deleteFilePromises = [];
					for (var i = 0; i < files.length; i++) {
						if (files[i].fileId) {
							deleteFilePromises.push(serverRest.deleteFile({
								server: server,
								fFileGUID: files[i].fileId
							}));
						}
					}

					return Promise.all(deleteFilePromises);
				})
				.then(function (results) {
					resolve({});
				})
				.catch((error) => {
					resolve({
						err: 'err'
					});
				});
		}
	});
};

var _createContentTypes = function (server, names) {
	return new Promise(function (resolve, reject) {
		var results = [];
		var doCreateType = names.reduce(function (typePromise, name) {
				return typePromise.then(function (result) {
					var filePath = path.join(typesSrcDir, name, name + '.json');
					var typeObj;
					try {
						typeObj = JSON.parse(fs.readFileSync(filePath));
					} catch (e) {
						console.log(e);
					}

					return serverRest.createContentType({
						server: server,
						type: typeObj
					}).then(function (result) {
						results.push(result);
					});
				});
			},
			// Start with a previousPromise value that is a resolved promise 
			Promise.resolve({}));

		doCreateType.then(function (result) {
			resolve(results);
		});

	});
};


module.exports.createChannel = function (argv, done) {
	'use strict';

	if (!verifyRun(argv)) {
		done();
		return;
	}

	var serverName = argv.server;
	var server = serverUtils.verifyServer(serverName, projectDir);
	if (!server || !server.valid) {
		done();
		return;
	}
	console.log(' - server: ' + server.url);

	var name = argv.name;
	var desc = argv.description;
	var channelType = argv.type || 'public';
	var publishPolicy = argv.publishpolicy || 'anythingPublished';
	var localizationPolicyName = argv.localizationpolicy;

	var localizationId;

	serverUtils.loginToServer(server, serverUtils.getRequest()).then(function (result) {
		if (!result.status) {
			console.log(' - failed to connect to the server');
			done();
			return;
		}

		serverRest.getChannels({
				server: server
			})
			.then(function (result) {
				if (result.err) {
					return Promise.reject();
				}

				var channels = result || [];
				for (var i = 0; i < channels.length; i++) {
					if (name.toLowerCase() === channels[i].name.toLowerCase()) {
						console.log('ERROR: channel ' + name + ' already exists');
						return Promise.reject();
					}
				}
				var localizationPolicyPromises = [];
				if (localizationPolicyName) {
					localizationPolicyPromises.push(serverRest.getLocalizationPolicies({
						server: server
					}));
				}
				return Promise.all(localizationPolicyPromises);
			})
			.then(function (results) {
				var policies = results.length > 0 ? results[0] : [];
				for (var i = 0; i < policies.length; i++) {
					if (localizationPolicyName === policies[i].name) {
						localizationId = policies[i].id;
						break;
					}
				}

				if (localizationPolicyName && !localizationId) {
					console.log('ERROR: localization policy ' + localizationPolicyName + ' does not exist');
					return Promise.reject();
				}
				if (localizationPolicyName) {
					console.log(' - verify localization policy ');
				}

				return serverRest.createChannel({
					server: server,
					name: name,
					description: desc,
					channelType: channelType,
					publishPolicy: publishPolicy,
					localizationPolicy: localizationId
				});
			})
			.then(function (result) {
				if (result.err) {
					return Promise.reject();
				}
				// console.log(result);
				console.log(' - channel ' + name + ' created');

				done(true);
			})
			.catch((error) => {
				done();
			});
	});
};

module.exports.shareChannel = function (argv, done) {
	'use strict';

	if (!verifyRun(argv)) {
		done();
		return;
	}

	var serverName = argv.server;
	var server = serverUtils.verifyServer(serverName, projectDir);

	if (!server || !server.valid) {
		done();
		return;
	}

	console.log(' - server: ' + server.url);

	var name = argv.name;
	var userNames = argv.users ? argv.users.split(',') : [];
	var groupNames = argv.groups ? argv.groups.split(',') : [];
	var role = argv.role;

	var channel;
	var users = [];
	var groups = [];
	var goodUserName = [];
	var goodGroupNames = [];

	serverUtils.loginToServer(server, serverUtils.getRequest()).then(function (result) {
		if (!result.status) {
			console.log(' - failed to connect to the server');
			done();
			return;
		}

		serverRest.getChannelWithName({
				server: server,
				name: name
			}).then(function (result) {
				if (result.err) {
					return Promise.reject();
				} else if (!result.data) {
					console.log('ERROR: channel ' + name + ' not found');
					return Promise.reject();
				}
				channel = result.data;

				if (channel.isSiteChannel) {
					console.log('ERROR: channel ' + name + ' is a site channel');
					return Promise.reject();
				}

				console.log(' - verify channel');

				var groupPromises = [];
				groupNames.forEach(function (gName) {
					groupPromises.push(
						serverRest.getGroup({
							server: server,
							name: gName
						}));
				});
				return Promise.all(groupPromises);

			})
			.then(function (result) {

				if (groupNames.length > 0) {
					console.log(' - verify groups');

					// verify groups
					var allGroups = result || [];
					for (var i = 0; i < groupNames.length; i++) {
						var found = false;
						for (var j = 0; j < allGroups.length; j++) {
							if (allGroups[j].name && groupNames[i].toLowerCase() === allGroups[j].name.toLowerCase()) {
								found = true;
								groups.push(allGroups[j]);
								break;
							}
						}
						if (!found) {
							console.log('ERROR: group ' + groupNames[i] + ' does not exist');
						}
					}
				}

				var usersPromises = [];
				for (var i = 0; i < userNames.length; i++) {
					usersPromises.push(serverRest.getUser({
						server: server,
						name: userNames[i]
					}));
				}

				return Promise.all(usersPromises);
			})
			.then(function (results) {
				var allUsers = [];
				for (var i = 0; i < results.length; i++) {
					if (results[i].items) {
						allUsers = allUsers.concat(results[i].items);
					}
				}
				if (userNames.length > 0) {
					console.log(' - verify users');
				}

				// verify users
				for (var k = 0; k < userNames.length; k++) {
					var found = false;
					for (var i = 0; i < allUsers.length; i++) {
						if (allUsers[i].loginName.toLowerCase() === userNames[k].toLowerCase()) {
							users.push(allUsers[i]);
							found = true;
							break;
						}
						if (found) {
							break;
						}
					}
					if (!found) {
						console.log('ERROR: user ' + userNames[k] + ' does not exist');
					}
				}

				if (users.length === 0 && groups.length === 0) {
					return Promise.reject();
				}

				return serverRest.getResourcePermissions({
					server: server,
					id: channel.id,
					type: 'channel'
				});
			})
			.then(function (result) {
				if (!result || result.err) {
					return Promise.reject();
				}

				var existingPermissions = result && result.permissions || [];
				var i, j;
				var groupsToGrant = [];
				for (i = 0; i < groups.length; i++) {
					var groupGranted = false;
					for (j = 0; j < existingPermissions.length; j++) {
						var perm = existingPermissions[j];
						if (perm.roleName === role && perm.type === 'group' &&
							perm.groupType === groups[i].groupOriginType && perm.fullName === groups[i].name) {
							groupGranted = true;
							break;
						}
					}
					if (groupGranted) {
						console.log(' - group ' + groups[i].name + ' already granted with role ' + role + ' on channel' + name);
					} else {
						groupsToGrant.push(groups[i]);
						goodGroupNames.push(groups[i].name);
					}
				}

				var usersToGrant = [];
				for (i = 0; i < users.length; i++) {
					var granted = false;
					for (j = 0; j < existingPermissions.length; j++) {
						var perm = existingPermissions[j];
						if (perm.roleName === role && perm.type === 'user' && perm.id === users[i].loginName) {
							granted = true;
							break;
						}
					}
					if (granted) {
						console.log(' - user ' + users[i].loginName + ' already granted with role ' + role + ' on channel ' + name);
					} else {
						usersToGrant.push(users[i]);
						goodUserName.push(users[i].loginName);
					}
				}

				return serverRest.performPermissionOperation({
					server: server,
					operation: 'share',
					resourceId: channel.id,
					resourceType: 'channel',
					role: role,
					users: usersToGrant,
					groups: groupsToGrant
				});
			})
			.then(function (result) {
				if (result.err) {
					return Promise.reject();
				}
				if (goodUserName.length > 0) {
					console.log(' - user ' + (goodUserName.join(', ')) + ' granted with role ' + role + ' on channel ' + name);
				}
				if (goodGroupNames.length > 0) {
					console.log(' - group ' + (goodGroupNames.join(', ')) + ' granted with role ' + role + ' on channel ' + name);
				}
				done(true);
			})
			.catch((error) => {
				done();
			});
	});
};

module.exports.unshareChannel = function (argv, done) {
	'use strict';

	if (!verifyRun(argv)) {
		done();
		return;
	}

	var serverName = argv.server;
	var server = serverUtils.verifyServer(serverName, projectDir);

	if (!server || !server.valid) {
		done();
		return;
	}

	console.log(' - server: ' + server.url);

	var name = argv.name;
	var userNames = argv.users ? argv.users.split(',') : [];
	var groupNames = argv.groups ? argv.groups.split(',') : [];
	var channel;
	var users = [];
	var groups = [];
	var goodUserName = [];
	var goodGroupNames = [];

	serverUtils.loginToServer(server, serverUtils.getRequest()).then(function (result) {
		if (!result.status) {
			console.log(' - failed to connect to the server');
			done();
			return;
		}

		serverRest.getChannelWithName({
				server: server,
				name: name
			}).then(function (result) {
				if (result.err) {
					return Promise.reject();
				} else if (!result.data) {
					console.log('ERROR: channel ' + name + ' not found');
					return Promise.reject();
				}
				channel = result.data;

				if (channel.isSiteChannel) {
					console.log('ERROR: channel ' + name + ' is a site channel');
					return Promise.reject();
				}

				console.log(' - verify channel');

				var groupPromises = [];
				groupNames.forEach(function (gName) {
					groupPromises.push(
						serverRest.getGroup({
							server: server,
							name: gName
						}));
				});
				return Promise.all(groupPromises);

			})
			.then(function (result) {

				if (groupNames.length > 0) {
					console.log(' - verify groups');

					// verify groups
					var allGroups = result || [];
					for (var i = 0; i < groupNames.length; i++) {
						var found = false;
						for (var j = 0; j < allGroups.length; j++) {
							if (allGroups[j].name && groupNames[i].toLowerCase() === allGroups[j].name.toLowerCase()) {
								found = true;
								groups.push(allGroups[j]);
								goodGroupNames.push(groupNames[i]);
								break;
							}
						}
						if (!found) {
							console.log('ERROR: group ' + groupNames[i] + ' does not exist');
						}
					}
				}

				var usersPromises = [];
				for (var i = 0; i < userNames.length; i++) {
					usersPromises.push(serverRest.getUser({
						server: server,
						name: userNames[i]
					}));
				}

				return Promise.all(usersPromises);
			})
			.then(function (results) {
				var allUsers = [];
				for (var i = 0; i < results.length; i++) {
					if (results[i].items) {
						allUsers = allUsers.concat(results[i].items);
					}
				}
				if (userNames.length > 0) {
					console.log(' - verify users');
				}

				// verify users
				for (var k = 0; k < userNames.length; k++) {
					var found = false;
					for (var i = 0; i < allUsers.length; i++) {
						if (allUsers[i].loginName.toLowerCase() === userNames[k].toLowerCase()) {
							users.push(allUsers[i]);
							goodUserName.push(userNames[k]);
							found = true;
							break;
						}
						if (found) {
							break;
						}
					}
					if (!found) {
						console.log('ERROR: user ' + userNames[k] + ' does not exist');
					}
				}

				if (users.length === 0 && groups.length === 0) {
					return Promise.reject();
				}

				return serverRest.performPermissionOperation({
					server: server,
					operation: 'unshare',
					resourceId: channel.id,
					resourceType: 'channel',
					users: users,
					groups: groups
				});
			})
			.then(function (result) {
				if (result.err) {
					return Promise.reject();
				}

				if (goodUserName.length > 0) {
					console.log(' - the access of user ' + (goodUserName.join(', ')) + ' to type ' + name + ' removed');
				}
				if (goodGroupNames.length > 0) {
					console.log(' - the access of group ' + (goodGroupNames.join(', ')) + ' to type ' + name + ' removed');
				}
				done(true);
			})
			.catch((error) => {
				done();
			});
	});
};


module.exports.createLocalizationPolicy = function (argv, done) {
	'use strict';

	if (!verifyRun(argv)) {
		done();
		return;
	}

	var serverName = argv.server;
	var server = serverUtils.verifyServer(serverName, projectDir);
	if (!server || !server.valid) {
		done();
		return;
	}
	console.log(' - server: ' + server.url);

	var name = argv.name;
	var desc = argv.description;
	var requiredLanguages = argv.requiredlanguages.split(',');
	var defaultLanguage = argv.defaultlanguage;
	var optionalLanguages = argv.optionallanguages ? argv.optionallanguages.split(',') : [];

	serverUtils.loginToServer(server, serverUtils.getRequest()).then(function (result) {
		if (!result.status) {
			console.log(' - failed to connect to the server');
			done();
			return;
		}

		serverRest.getLocalizationPolicies({
				server: server
			})
			.then(function (result) {
				if (result.err) {
					return Promise.reject();
				}

				// verify if the localization policy exists
				var policies = result || [];
				for (var i = 0; i < policies.length; i++) {
					if (name === policies[i].name) {
						console.log('ERROR: localization policy ' + name + ' already exists');
						return Promise.reject();
					}
				}

				console.log(' - verify localization policy name');

				return serverRest.createLocalizationPolicy({
					server: server,
					name: name,
					description: desc,
					defaultLanguage: defaultLanguage,
					requiredLanguages: requiredLanguages,
					optionalLanguages: optionalLanguages
				});
			})
			.then(function (result) {
				if (result.err) {
					return Promise.reject();
				}
				// console.log(result);
				console.log(' - localization policy ' + name + ' created');

				done(done);
			})
			.catch((error) => {
				done();
			});
	});
};

module.exports.listAssets = function (argv, done) {
	'use strict';

	if (!verifyRun(argv)) {
		done();
		return;
	}

	var serverName = argv.server;
	var server = serverUtils.verifyServer(serverName, projectDir);
	if (!server || !server.valid) {
		done();
		return;
	}
	console.log(' - server: ' + server.url);

	var channelName = argv.channel;
	var query = argv.query;
	var repositoryName = argv.repository;
	var collectionName = argv.collection;
	if (collectionName && !repositoryName) {
		console.log('ERROR: no repository is specified');
		done();
		return;
	}

	var total;
	var repository, collection, channel, channelToken;

	var showURLS = typeof argv.urls === 'boolean' ? argv.urls : argv.urls === 'true';

	serverUtils.loginToServer(server, serverUtils.getRequest()).then(function (result) {
		if (!result.status) {
			console.log(' - failed to connect to the server');
			done();
			return;
		}

		var repositoryPromises = [];
		if (repositoryName) {
			repositoryPromises.push(serverRest.getRepositoryWithName({
				server: server,
				name: repositoryName
			}));
		}
		Promise.all(repositoryPromises).then(function (results) {
				if (repositoryName) {
					if (!results || !results[0] || results[0].err) {
						return Promise.reject();
					} else if (!results[0].data) {
						console.log('ERROR: repository ' + repositoryName + ' not found');
						return Promise.reject();
					}
					repository = results[0].data;
					console.log(' - validate repository (Id: ' + repository.id + ')');
				}

				var collectionPromises = [];
				if (collectionName) {
					collectionPromises.push(serverRest.getCollectionWithName({
						server: server,
						repositoryId: repository.id,
						name: collectionName
					}));
				}

				return Promise.all(collectionPromises);
			})
			.then(function (results) {
				if (collectionName) {
					if (!results || !results[0] || results[0].err) {
						return Promise.reject();
					} else if (!results[0].data) {
						console.log('ERROR: collection ' + collectionName + ' not found');
						return Promise.reject();
					}
					collection = results[0].data;
					console.log(' - validate collection (Id: ' + collection.id + ')');
				}

				var channelPromises = [];
				if (channelName) {
					channelPromises.push(serverRest.getChannelWithName({
						server: server,
						name: channelName
					}));
				}

				return Promise.all(channelPromises);
			})
			.then(function (results) {
				if (channelName) {
					if (!results || !results[0] || results[0].err) {
						return Promise.reject();
					} else if (!results[0].data) {
						console.log('ERROR: channel ' + channelName + ' not found');
						return Promise.reject();
					}
					channel = results[0].data;

					var token;
					var tokens = channel.channelTokens;
					if (tokens && tokens.length === 1) {
						token = tokens[0].token;
					} else if (tokens && tokens.length > 0) {
						for (var j = 0; j < tokens.length; j++) {
							if (tokens[j].name === 'defaultToken') {
								token = tokens[j].token;
								break;
							}
						}
						if (!token) {
							token = tokens[0].channelToken;
						}
					}
					channelToken = token;
					console.log(' - validate channel (Id: ' + channel.id + ' token: ' + channelToken + ')');
				}

				// query items
				var q = '';
				if (repository) {
					q = '(repositoryId eq "' + repository.id + '")';
				}
				if (collection) {
					if (q) {
						q = q + ' AND ';
					}
					q = q + '(collections co "' + collection.id + '")';
				}
				if (channel) {
					if (q) {
						q = q + ' AND ';
					}
					q = q + '(channels co "' + channel.id + '")';
				}
				if (query) {
					if (q) {
						q = q + ' AND ';
					}
					q = q + '(' + query + ')';
				}

				if (q) {
					console.log(' - query: ' + q);
				} else {
					console.log(' - query all assets');
				}

				return serverRest.queryItems({
					server: server,
					q: q,
					fields: 'name,status,slug',
					includeAdditionalData: true
				});
			})
			.then(function (result) {
				if (result.err) {
					return Promise.reject();
				}

				var items = result && result.data || [];
				total = items.length;

				console.log(' - total items: ' + total);

				if (total > 0) {
					_displayAssets(server, repository, collection, channel, channelToken, items, showURLS);
					console.log(' - total items: ' + total);
				}

				done(true);
			})
			.catch((error) => {
				done();
			});
	});
};

var _displayAssets = function (server, repository, collection, channel, channelToken, items, showURLS) {
	var types = [];
	var allIds = [];
	for (var i = 0; i < items.length; i++) {
		allIds.push(items[i].id);
		if (!types.includes(items[i].type)) {
			types.push(items[i].type);
		}
	}

	// sort types
	var byType = types.slice(0);
	byType.sort(function (a, b) {
		var x = a;
		var y = b;
		return (x < y ? -1 : x > y ? 1 : 0);
	});
	types = byType;

	var list = [];
	for (var i = 0; i < types.length; i++) {
		list.push({
			type: types[i],
			items: []
		});
	}

	for (var i = 0; i < items.length; i++) {
		for (var j = 0; j < list.length; j++) {
			if (items[i].type === list[j].type) {
				list[j].items.push(items[i]);
			}
		}
	}

	// sort name
	for (var i = 0; i < list.length; i++) {
		var byName = list[i].items.slice(0);
		byName.sort(function (a, b) {
			var x = a.name;
			var y = b.name;
			return (x < y ? -1 : x > y ? 1 : 0);
		});
		list[i].items = byName;
	}

	var format = '   %-15s %-s';
	if (repository) {
		console.log(sprintf(format, 'Repository:', repository.name));
	}
	if (collection) {
		console.log(sprintf(format, 'Collection:', collection.name));
	}
	if (channel) {
		console.log(sprintf(format, 'Channel:', channel.name));
	}
	console.log(sprintf(format, 'Items:', ''));
	var format2;

	if (showURLS) {
		format2 = '   %-s';
		// console.log(sprintf(format2, 'Name', 'URLs'));
		items.forEach(function (item) {
			var managementUrl = server.url + '/content/management/api/v1.1/items/' + item.id;
			console.log(sprintf(format2, item.name));
			console.log(sprintf(format2, managementUrl));
			if (channelToken && item.status === 'published') {
				var deliveryUrl = server.url + '/content/published/api/v1.1/items/' + item.id + '?channelToken=' + channelToken;
				console.log(sprintf(format2, deliveryUrl));
			}
			console.log('');
		});

	} else {
		format2 = '   %-38s %-38s %-11s %-10s %-s';
		console.log(sprintf(format2, 'Type', 'Id', 'Status', 'Size', 'Name'));

		var totalSize = 0;
		for (var i = 0; i < list.length; i++) {
			for (var j = 0; j < list[i].items.length; j++) {
				var item = list[i].items[j];
				if (item.fields && item.fields.size) {
					totalSize = totalSize + item.fields.size;
				}
				// console.log(item);
				var typeLabel = j === 0 ? item.type : '';
				var sizeLabel = item.fields && item.fields.size ? item.fields.size : '';
				console.log(sprintf(format2, typeLabel, item.id, item.status, sizeLabel, item.name));
			}
		}

		console.log('');
		if (totalSize > 0) {
			console.log(' - total file size: ' + (Math.floor(totalSize / 1024)) + 'k');
		}
	}

};