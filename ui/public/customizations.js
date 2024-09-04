function getCustomizations() {
    const databaseActions = {
        status: {
            value: (data) => data.status && data.status.state,
            buttons: [
                {
                    "label": "Start Database",
                    "patch": [
                        {
                            "op": "remove",
                            "path": "/maintenance"
                        }
                    ],
                    "visible": (data) => data.maintenance ? data.maintenance.isDisabled == true : false,
                    "confirm": "Do you want to start Database {organization}/{project}/{name}?",
                },
                {
                    "label": "Stop Database",
                    "patch": [
                        {
                            "op": "add",
                            "path": "/maintenance",
                            "value": {
                                "isDisabled": true
                            }
                        }
                    ],
                    "visible": (data) => !data.maintenance,
                    "confirm": "Do you want to stop Database {organization}/{project}/{name}?",
                },
                {
                    "label": "Stop Database",
                    "patch": [
                        {
                            "op": "replace",
                            "path": "/maintenance",
                            "value": {
                                "isDisabled": true
                            }
                        }
                    ],
                    "visible": (data) => data.maintenance && data.maintenance.isDisabled == false,
                    "confirm": "Do you want to stop Database {organization}/{project}/{name}?",
                }
            ]
        },
        extendedStatus: {
            value: (data) => {
                let status = data.status && {...data.status};
                delete status.state;
                return status;
            }
        },
    };

    const backupPolicyActions = {
        "show": {
            buttons: [
                {
                    "label": "Show Databases",
                    "link": "/ui/resource/list/backuppolicies/{organization}/{name}/databases",
                },
                {
                    "label": "Show Backups",
                    "link": "/ui/resource/list/backuppolicies/{organization}/{name}/backups"
                }
            ]
        }
    };

    const formCreateUsers = {
        fields: {
            organization: {},
            name: {},
            password: {
                required: true
            },
            "accessRule": {},
            "*": {
                advanced: true
            }
        }
    };

    const formEditUsers = {
        fields: {
            password: {
                hidden: true
            },
            "*": {}
        }
    };

    const formCreateProjects = {
        fields: {
            organization: {},
            name: {},
            sla: {},
            tier: {},
            "*": {
                advanced: true
            }
        }
    };

    const formCreateDatabases = {
        fields: {
            organization: {},
            project: {},
            name: {},
            dbaPassword: {},
            "*": {
                advanced: true
            }
        }
    };

    const formEditDatabases = {
        fields: {
            "dbaPassword": {
                hidden: true
            },
            "*": {}
        }
    };

    const formCreateBackups = {
        fields: {
            organization: {},
            project: {},
            database: {},
            name: {},
            "*": {
                advanced: true
            }
        }
    };

    const formCreateBackuppolicies = {
        fields: {
            organization: {},
            name: {},
            frequency: {},
            "selector.scope": {},
            "*": {
                advanced:true
            }
        }
    };

    return {
    "views": {
        "/databases": databaseActions,
        "/databases/{organization}": databaseActions,
        "/databases/{organization}/{project}": databaseActions,
        "/backuppolicies": backupPolicyActions,
        "/backuppolicies/{organization}": backupPolicyActions,
    },
    "forms": {
        "/users": formCreateUsers,
        "/users/{organization}": formCreateUsers,
        "/users/{organization}/{name}": formEditUsers,
        "/projects": formCreateProjects,
        "/projects/{organization}": formCreateProjects,
        "/databases": formCreateDatabases,
        "/databases/{organization}": formCreateDatabases,
        "/databases/{organization}/{project}": formCreateDatabases,
        "/databases/{organization}/{project}/{name}": formEditDatabases,
        "/backups": formCreateBackups,
        "/backups/{organization}": formCreateBackups,
        "/backups/{organization}/{project}": formCreateBackups,
        "/backups/{organization}/{project}/{database}": formCreateBackups,
        "/backuppolicies": formCreateBackuppolicies,
        "/backuppolicies/{organization}": formCreateBackuppolicies,
    }
}
}