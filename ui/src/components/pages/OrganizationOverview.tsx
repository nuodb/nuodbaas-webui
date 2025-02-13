// (C) Copyright 2025 Dassault Systemes SE.  All Rights Reserved.

import Path from "./parts/Path";
import { PageProps } from "../../utils/types";
import PageLayout from "./parts/PageLayout";
import { withTranslation } from "react-i18next";
import { TextFieldProps } from "../controls/TextField";
import TextField from "@mui/material/TextField";
import InfoPopup from "../controls/InfoPopup";
import InputAdornment from "@mui/material/InputAdornment";
import IconButton from "@mui/material/IconButton";

function TFPlain(props: TextFieldProps): JSX.Element {
    let fieldProps = { ...props };
    delete fieldProps.icon;
    delete fieldProps.leftIcon;
    delete fieldProps.iconOnClick;
    return <div>
        <div className="NuoFieldBase NuoFieldString" key={props.id} aria-details={props.description}>
            <label>{props.label}</label>
            <input name={props.id} {...fieldProps} />
            {props.iconOnClick && <button onClick={(event) => {
                event.preventDefault();
                props.iconOnClick && props.iconOnClick(event);
            }}>{props.icon}</button>}
            {props.description && <InfoPopup description={props.description} />}
        </div>
        {props.error !== "" && <div className="NuoFieldError">{props.error}</div>}
    </div>
}

function TFMaterial(props: TextFieldProps): JSX.Element {
    let fieldProps = { ...props };
    delete fieldProps.icon;
    delete fieldProps.leftIcon;
    delete fieldProps.iconOnClick;
    return <TextField
        fullWidth={true}
        {...fieldProps}
        name={props.id}
        aria-details={props.description}
        error={!!props.error}
        helperText={props.error}
        slotProps={((props.icon || props.leftIcon || fieldProps.description) && {
            input: {
                endAdornment: props.icon &&
                    <InputAdornment position="end">
                        {props.icon && <IconButton
                            aria-label=""
                            onClick={props.iconOnClick}
                        >
                            {props.icon}
                        </IconButton>}
                        {props.description && <InfoPopup description={props.description} />}
                    </InputAdornment>,
                startAdornment: props.leftIcon &&
                    <InputAdornment position="start">
                        {props.leftIcon}
                    </InputAdornment>,
            }
        }) || undefined
        }
    />;
}

function OrganizationOverview(props: PageProps) {
    return <PageLayout {...props}>
        <Path schema={props.schema} prefixLabel="Organization" path="Organization Overview" filterValues={[]} />
    </PageLayout>;
}

export default withTranslation()(OrganizationOverview);