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

    return {
    "views": {
        "/databases": databaseActions,
        "/databases/{organization}": databaseActions,
        "/databases/{organization}/{project}": databaseActions,
        "/backuppolicies": backupPolicyActions,
        "/backuppolicies/{organization}": backupPolicyActions
    }
}
}