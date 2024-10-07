# NuoDBaaS WebUI customizations

The NuoDBaaS WebUI allows for UI customizations to handle special cases which are not defined in the OpenAPI spec file. These are currently action buttons in the views and in the future will be extended to simplified forms.
The configuration file is currently stored in `public/customizations.json` and is a JSON file containing configurations, macros ("value" and "disabled" attributes.

## Example configuration file

```
function getCustomizations() {
    return {
    "views": {
        "/databases": {
            status: {
                value: "status.ready),
                buttons: [
                    {
                        "label": "Start Database",
                        "patch": [
                            {
                                "op": "remove",
                                "path": "/maintenance"
                            }
                        ],
                        "visible": "maintenance",
                        "confirm": "Do you want to start Database {organization}/{project}/{name}?",
                    },
                ]
            }
        },
        "/backuppolicies": {
            "show": {
                buttons: [
                    {
                        "label": "Show Databases",
                        "link": "/ui/resource/list/backuppolicies/{organization}/{name}/databases"
                    }
                ]
            }
        },
    }
}
}
```

### Configuration file definition

```
function getCustomizations() {
    return {
    "views": {
        "RESOURCE_PATH": {
            COLUMH_FIELDNAME: {
                value: (DATA_CONTAINING_ROW_VALUES) => CALLBACK_TO_CALCULATE_COLUMN_VALUE,
                buttons: [
                    {
                        "label": BUTTON_LABEL,
                        "patch": PATCH_BODY,
                        "visible": (DATA_CONTAINING_ROW_VALUES) => CALLBACK_TO_DETERMINE_IF_BUTTON_IS_VISIBLE,
                        "confirm": CONFIRM_DIALOG_TEXT,
                    },
                ]
            }
        },
        "RESOURCE_PATH": {
            COLUMN_FIELDNAME: {
                buttons: [
                    {
                        "label": BUTTON_LABEL,
                        "link": REDIRECT_LINK_WHEN_BUTTON_IS_PRESSED
                    }
                ]
            }
        },
    }
}
}
```

### Explanation of configuration file definition

The NuoDBaaS WebUI will include the `customizations.json` file to retrieve the customization definitions.

- The only root keyword is `views` right now defining view definitions
- The `views` object contains a list of `RESOURCE_PATH` definition based on the Control Plane Rest API. These paths can have placeholders, i.e. `/databases/{organization}/{project}` which match with the definitions in the OpenAPI spec. All child elements below this resource path define how the view for this resource path is customized.
- `COLUMN_FIELDNAME` are column names which should be modified in the view
- The `value` attribute below the `COLUMN_FIELDNAME` specifies a callback to calculate the value which should be shown in the view column for that row which is passed into this callback function. This attribute is optional
- The `buttons` attribute below the `COLUMN_FIELDNAME` contains a list of buttons to be shown in this column after the column value.

### Buttons definition

Each button has following attributes:

- `label`: title of the button. Can contain placeholders such as `{organization}`
- `link`: URL path (relative or absolute) where to redirect the user to when the button is pressed. Either `link` or `patch` need to be specified.
- `patch`: payload to send to the Control Plane REST API if the button is pressed. Either `patch` or `link` need to be specified
- `visible` (optional): callback to determine if the button should be shown.
- `confirm` (optional): show a confirm dialog with the provided text. Can have placeholders like `{organization}`
