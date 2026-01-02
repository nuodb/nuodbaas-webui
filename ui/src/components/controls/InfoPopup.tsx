// (C) Copyright 2025 Dassault Systemes SE.  All Rights Reserved.

import InfoIconOutlined from '@mui/icons-material/InfoOutlined';
import { JSX } from 'react';

type InfoPopupProps = {
    description?: string;
};

/* Shows an (i) icon which will popup the specified description when hovering over. */
export default function InfoPopup(props: InfoPopupProps): JSX.Element {
    const { description } = props;

    return (description && <div className="NuoInfoPopup NuoInfoPopupHover"><label>{description}</label><InfoIconOutlined /></div>) || <></>;
}
