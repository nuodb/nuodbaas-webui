function getCustomizations() {
    const databaseView = {
        status: {
            value: (data) => data.status && ((data.status.ready ? "Ready" : "Not Ready") + " - " + data.status.state),
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
                delete status.ready;
                delete status.state;
                return status;
            }
        },
    };

    return {
    "views": {
        "/databases": databaseView,
        "/databases/{organization}": databaseView,
        "/databases/{organization}/{project}": databaseView
    }
}
}