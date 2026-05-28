# NuoDBaaS WebUI customizations

The NuoDBaaS WebUI supports JSON-based customizations that are merged at startup and then used to alter list views, row action menus, forms, and theme-related settings.

Customization data is loaded from the following sources, in this order:

1. `ui/public/theme/base.json`
2. `ui/public/theme/custom.json`
3. user settings stored in browser local storage under `nuodbaas_webui_userSettings`

Later sources override earlier ones. Object values are merged recursively. Arrays are replaced by default, but can also be appended to by using a key with the `-append` suffix, for example `menu-append` or `columns-append`.

## Where customizations are used

Customizations are consumed from `ui/src/utils/Customizations.tsx` and referenced from several UI components:

- list/table views use `views.<RESOURCE_PATH>.columns`, `views.<RESOURCE_PATH>.fields`, `views.<RESOURCE_PATH>.menu`, and `views.<RESOURCE_PATH>.links`
- create/edit/view forms use `forms.<RESOURCE_PATH>.sections`
- CSS and other theme settings are loaded from `theme`
- user-specific column selections are persisted back into local storage and merged into the active customization set

## Merge behavior

The merge logic is implemented in `mergeRecursive()`.

- objects are merged recursively
- scalar values replace previous values
- arrays replace previous arrays by default
- arrays can be appended to by using a sibling key ending in `-append`

Examples:

### Override an existing array

```json
{
  "views": {
    "/databases": {
      "columns": ["name", "organization", "project", "status"]
    }
  }
}
```

This replaces the full `columns` array inherited from `base.json`.

### Append to an existing array

```json
{
  "views": {
    "/databases": {
      "columns-append": ["labels", "tier"]
    }
  }
}
```

This keeps the inherited columns and appends `labels` and `tier`.

### Append menu entries

```json
{
  "views": {
    "/projects": {
      "menu-append": [
        {
          "label": "button.show.databases",
          "link": "/ui/resource/list/databases/{organization}/{name}"
        }
      ]
    }
  }
}
```

### Override one nested property only

```json
{
  "forms": {
    "/databases/{organization}/{project}/{name}": {
      "sections": [
        {
          "fields": {
            "dbaPassword": {
              "hidden": false
            },
            "*": {}
          }
        }
      ]
    }
  }
}
```

## Top-level structure

```json
{
  "theme": {
    "css": "..."
  },
  "views": {
    "RESOURCE_PATH": {
      "columns": ["FIELD", "..."],
      "columns-append": ["FIELD", "..."],
      "fields": {
        "FIELD_NAME": {
          "label": "LABEL_OR_I18N_KEY",
          "value": "FORMULA"
        }
      },
      "menu": [
        {
          "label": "LABEL_OR_I18N_KEY",
          "icon": "MUI_ICON_NAME",
          "patch": [],
          "writeAccessRequired": true,
          "visible": "FORMULA",
          "confirm": "LABEL_OR_I18N_KEY",
          "dialog": "DIALOG_NAME",
          "link": "/ui/...",
          "linkTarget": "_blank"
        }
      ],
      "menu-append": [
        {
          "label": "LABEL_OR_I18N_KEY",
          "link": "/ui/..."
        }
      ],
      "links": {
        "FIELD_NAME": {
          "link": "https://example.com/{name}",
          "linkTarget": "_blank"
        }
      }
    }
  },
  "forms": {
    "RESOURCE_PATH": {
      "sections": [
        {
          "title": "SECTION_TITLE_OR_I18N_KEY",
          "fields": {
            "fieldName": {
              "required": true,
              "expand": false,
              "hidden": false
            },
            "nested.field": {
              "hidden": true
            },
            "*": {}
          }
        }
      ]
    }
  }
}
```

## Loading and file locations

Server-provided customization files are read from:

- `ui/public/theme/base.json`
- `ui/public/theme/custom.json`

User-specific customizations are edited in the UI settings page and stored in browser local storage under `nuodbaas_webui_userSettings`.

The `custom.json` file is intended to override or extend the defaults from `base.json`. This file can be replaced by volume-mounting the docker container at `/usr/share/nginx/html/theme/custom.json` or by setting the helm value `nuodbaasWebui.customJson` with the content of the file (i.e. by using the `--set-file` option.

## `views` customizations

The `views` object contains per-resource-path customizations for list and table pages.

A resource path is typically an OpenAPI path such as `/databases`, `/backuppolicies`, or `/projects`. View lookup matches either the exact path or a child path starting with that path.

### Supported view properties

#### `columns`

Defines the visible column order for a table view.

Example:

```json
{
  "views": {
    "/backuppolicies": {
      "columns": ["name", "organization", "frequency", "selector", "retention"]
    }
  }
}
```

#### `columns-append`

Appends additional columns to an inherited `columns` array.

Example:

```json
{
  "views": {
    "/backuppolicies": {
      "columns-append": ["properties", "labels"]
    }
  }
}
```

#### `fields`

Overrides per-column label and/or displayed value.

Supported field properties:

- `label`: replacement label or i18n key for the column
- `value`: formula evaluated against the row data

Example:

```json
{
  "views": {
    "/databases": {
      "fields": {
        "status": {
          "label": "Database state",
          "value": "status.state"
        }
      }
    }
  }
}
```

#### `menu`

Defines row action menu entries shown in the resource popup menu.

Supported menu item properties:

- `label`: menu label, usually an i18n key
- `icon` (optional): icon name rendered via the shared `Icon` component
- `patch` (optional): JSON Patch payload sent to the REST API
- `writeAccessRequired` (optional): requires `PUT` access in addition to any other checks
- `visible` (optional): formula controlling whether the item is shown
- `confirm` (optional): translation key or text shown in a confirmation dialog
- `dialog` (optional): opens a built-in custom dialog
- `link` (optional): navigates to a relative UI route or leaves absolute URLs untouched
- `linkTarget` (currently typed but not used by the row action handler)

A menu item should typically use one of:

- `patch`
- `link`
- `dialog`

Example using `patch`:

```json
{
  "views": {
    "/databases": {
      "menu": [
        {
          "label": "confirm.start.database.title",
          "icon": "PlayArrow",
          "patch": [
            {
              "op": "remove",
              "path": "/maintenance"
            }
          ],
          "visible": "maintenance.isDisabled",
          "confirm": "confirm.start.database.body"
        }
      ]
    }
  }
}
```

Example using `link`:

```json
{
  "views": {
    "/backuppolicies": {
      "menu": [
        {
          "label": "button.show.backups",
          "link": "/ui/resource/list/backuppolicies/{organization}/{name}/backups"
        }
      ]
    }
  }
}
```

Example using `dialog`:

```json
{
  "views": {
    "/databases": {
      "menu-append": [
        {
          "label": "button.db.connection.info",
          "icon": "Info",
          "dialog": "DbConnectionInfo"
        }
      ]
    }
  }
}
```

Currently Supported built-in dialogs:

- `DbConnectionInfo`
- `ChangeDbaPassword`

Unknown dialog names fall back to a generic dialog showing an error and the row data.

#### `menu-append`

Appends menu entries to inherited ones.

Example:

```json
{
  "views": {
    "/databases": {
      "menu-append": [
        {
          "label": "button.sql.editor",
          "icon": "Storage",
          "visible": "hasSqlEditorService()",
          "link": "/ui/page/sql/{organization}/{project}/{name}"
        }
      ]
    }
  }
}
```

#### `links`

The customization type defines `views.<path>.links.<field>`, where each entry supports:

- `link`
- `linkTarget` (optional)

Example:

```json
{
  "views": {
    "/databases": {
      "links": {
        "name": {
          "link": "https://example.com/{organization}/{project}/{name}",
          "linkTarget": "_blank"
        }
      }
    }
  }
}
```

## Form customizations

The `forms` object customizes create, edit, and view layouts.

Form definitions are matched by path using `matchesPath()`. Existing defaults in `base.json` use patterns such as:

- `/users?/{organization}?/{name}`
- `/projects?/{organization}?/{name}`
- `/databases?/{organization}?/{project}?/{database}`
- `/databases/{organization}/{project}/{name}`
- `/backups?/{organization}?/{project}?/{database}?/{name}`
- `/backuppolicies?/{organization}?/{name}`

This allows one definition to match create, edit, and view style paths.

### `sections`

A form is divided into tab sections. Each section supports:

- `title` (optional): tab title; if omitted, the section is treated as the general section
- `fields`: field configuration map

### `fields`

Each field entry key is either:

- a direct field name such as `name`
- a nested field path such as `roles.admin` or `selector.matchLabels`
- `*` to include all remaining fields not explicitly assigned earlier

Supported field properties:

- `required`: marks the field required
- `expand`: controls expansion for object fields
- `hidden`: hides the field

Example form layout:

```json
{
  "forms": {
    "/backuppolicies?/{organization}?/{name}": {
      "sections": [
        {
          "fields": {
            "organization": {},
            "name": {},
            "frequency": {},
            "suspended": {}
          }
        },
        {
          "title": "section.title.database.selection",
          "fields": {
            "selector": {
              "expand": false
            }
          }
        },
        {
          "title": "section.title.database.retention",
          "fields": {
            "retention": {}
          }
        },
        {
          "title": "section.title.advanced",
          "fields": {
            "*": {}
          }
        }
      ]
    }
  }
}
```

Example hiding a nested field:

```json
{
  "forms": {
    "/users?/{organization}?/{name}": {
      "sections": [
        {
          "fields": {
            "organization": {},
            "name": {},
            "password": {},
            "roles.admin": {
              "hidden": true
            }
          }
        },
        {
          "title": "section.title.advanced",
          "fields": {
            "*": {}
          }
        }
      ]
    }
  }
}
```

Example forcing an object field collapsed:

```json
{
  "forms": {
    "/users?/{organization}?/{name}": {
      "sections": [
        {
          "title": "section.title.access.deny.rules",
          "fields": {
            "accessRule": {
              "expand": false
            }
          }
        }
      ]
    }
  }
}
```

## Formula syntax

Formulas are used by `views.<path>.fields.<field>.value` and `views.<path>.menu[].visible`.

They are evaluated against the current row object. Supported syntax:

- field lookup: `status.state`
- logical NOT: `!maintenance`
- boolean cast: `!!field`
- equality: `maintenance.isDisabled=false`
- inequality: `field!=otherField`
- logical AND: `fieldA&fieldB`
- logical OR: `fieldA|fieldB`
- string constants in double quotes: `field=="value"`
- boolean constants: `true`, `false`
- special function: `hasSqlEditorService()`

Notes:

- for security reasons, formulas are intentionally simple and are not JavaScript expressions
- spaces are tolerated in formulas
- values are resolved from the current row object
- invalid formulas evaluate to an empty string

Examples:

```json
{
  "views": {
    "/databases": {
      "fields": {
        "status": {
          "value": "status.state"
        }
      },
      "menu-append": [
        {
          "label": "button.sql.editor",
          "visible": "hasSqlEditorService()",
          "link": "/ui/page/sql/{organization}/{project}/{name}"
        },
        {
          "label": "confirm.stop.database.title",
          "visible": "!maintenance",
          "patch": [
            {
              "op": "add",
              "path": "/maintenance",
              "value": {
                "isDisabled": true
              }
            }
          ]
        }
      ]
    }
  }
}
```

## Path placeholders and substitutions

Several customization values support row-based placeholder substitution such as:

- `{organization}`
- `{project}`
- `{name}`

This is used for links and translated labels/confirmations that receive the row object as interpolation data.

Example:

```json
{
  "views": {
    "/projects": {
      "menu": [
        {
          "label": "button.show.databases",
          "link": "/ui/resource/list/databases/{organization}/{name}"
        }
      ]
    }
  }
}
```

## User settings and saved column layouts

The Settings page allows a user to edit raw customization JSON and save it into local storage. Table column selection changes made in the UI are also written back into local storage under the matching `views.<path>.columns` setting.

This means administrators can provide defaults in `base.json` / `custom.json`, while users can still override them locally.

## Practical examples

### Example: customer-specific overrides in `custom.json`

```json
{
  "theme": {
    "css": "/ui/theme/customer.css"
  },
  "views": {
    "/databases": {
      "fields": {
        "status": {
          "label": "Database status",
          "value": "status.state"
        }
      },
      "menu-append": [
        {
          "label": "button.sql.editor",
          "icon": "Storage",
          "visible": "hasSqlEditorService()",
          "link": "/ui/page/sql/{organization}/{project}/{name}"
        }
      ]
    }
  }
}
```

### Example: replace all backup policy actions

```json
{
  "views": {
    "/backuppolicies": {
      "menu": [
        {
          "label": "button.show.backups",
          "icon": "Info",
          "link": "/ui/resource/list/backuppolicies/{organization}/{name}/backups"
        }
      ]
    }
  }
}
```

### Example: append one extra backup policy action without losing defaults

```json
{
  "views": {
    "/backuppolicies": {
      "menu-append": [
        {
          "label": "button.show.databases",
          "icon": "Info",
          "link": "/ui/resource/list/backuppolicies/{organization}/{name}/databases"
        }
      ]
    }
  }
}
```

### Example: reorganize database form tabs

```json
{
  "forms": {
    "/databases?/{organization}?/{project}?/{database}": {
      "sections": [
        {
          "fields": {
            "organization": {},
            "project": {},
            "name": {},
            "dbaPassword": {}
          }
        },
        {
          "title": "section.title.labels",
          "fields": {
            "labels": {},
            "properties": {}
          }
        },
        {
          "title": "section.title.advanced",
          "fields": {
            "*": {}
          }
        }
      ]
    }
  }
}
```

### Example: site default plus user-local append

Server-side `custom.json`:

```json
{
  "views": {
    "/projects": {
      "columns": ["name", "organization", "sla", "tier"]
    }
  }
}
```

User-local settings:

```json
{
  "views": {
    "/projects": {
      "columns-append": ["labels"]
    }
  }
}
```

After merging, the effective columns become:

```json
["name", "organization", "sla", "tier", "labels"]
```
