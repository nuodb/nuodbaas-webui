function getCustomizations() {
    const viewDatabases = {
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

    const viewBackupPolicies = {
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
        sections: [
            {
                fields: {
                    organization: {},
                    name: {},
                    password: {
                        required: true
                    },
                    "accessRule": {},
                }
            },
            {
                title: "Advanced",
                fields: {
                    "*": {}
                }
            }
        ]
    };

    const formEditUsers = {
        sections: [
            {
                fields: {
                    password: {
                        hidden: true
                    },
                    "*": {}
                }
            }
        ]
    };

    const formCreateEditProjects = {
        sections: [
            {
                fields: {
                    organization: {},
                    name: {},
                    sla: {},
                    tier: {},
                }
            },
            {
                title: "Advanced",
                fields: {
                    "*": {}
                }
            }
        ]
    };

    const formCreateDatabases = {
        sections: [
            {
                fields: {
                    organization: {},
                    project: {},
                    name: {},
                    dbaPassword: {},
                }
            },
            {
                title: "Advanced",
                fields: {
                    "*": {}
                }
            }
        ]
    };

    const formEditDatabases = {
        sections: [
            {
                fields: {
                    "dbaPassword": {
                        hidden: true
                    },
                    "*": {}
                }
            }
        ]
    };

    const formCreateEditBackups = {
        sections: [
            {
                fields: {
                    organization: {},
                    project: {},
                    database: {},
                    name: {},
                }
            },
            {
                title: "Advanced",
                fields: {
                    "*": {}
                }
            }
        ]
    };

    const formCreateEditBackuppolicies = {
        sections: [
            {
                fields: {
                    organization: {},
                    name: {},
                    frequency: {},
                    suspended: {},
                }
            },
            {
                title: "Database Selection",
                fields: {
                    selector: {}
                }
            },
            {
                title: "Database Retention",
                fields: {
                    retention: {}
                }
            },
            {
                title: "Labels",
                fields: {
                    labels: {},
                    "properties": {}
                }
            },
            {
                title: "Advanced",
                fields: {
                    "*": {}
                }
            }
        ]
    };

    return {
    "views": {
        "/databases": viewDatabases,
        "/databases/{organization}": viewDatabases,
        "/databases/{organization}/{project}": viewDatabases,
        "/backuppolicies": viewBackupPolicies,
        "/backuppolicies/{organization}": viewBackupPolicies,
    },
    "forms": {
        "/users": formCreateUsers,
        "/users/{organization}": formCreateUsers,
        "/users/{organization}/{name}": formEditUsers,
        "/projects": formCreateEditProjects,
        "/projects/{organization}": formCreateEditProjects,
        "/projects/{organization}/{name}": formCreateEditProjects,
        "/databases": formCreateDatabases,
        "/databases/{organization}": formCreateDatabases,
        "/databases/{organization}/{project}": formCreateDatabases,
        "/databases/{organization}/{project}/{name}": formEditDatabases,
        "/backups": formCreateEditBackups,
        "/backups/{organization}": formCreateEditBackups,
        "/backups/{organization}/{project}": formCreateEditBackups,
        "/backups/{organization}/{project}/{database}": formCreateEditBackups,
        "/backups/{organization}/{project}/{database}/{name}": formCreateEditBackups,
        "/backuppolicies": formCreateEditBackuppolicies,
        "/backuppolicies/{organization}": formCreateEditBackuppolicies,
        "/backuppolicies/{organization}/{name}": formCreateEditBackuppolicies,
    }
}
}