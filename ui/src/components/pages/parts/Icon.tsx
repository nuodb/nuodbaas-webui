// (C) Copyright 2025 Dassault Systemes SE.  All Rights Reserved.

import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import InfoIcon from '@mui/icons-material/Info';
import StorageIcon from '@mui/icons-material/Storage';

export default function Icon({name}: {name: string|undefined;}) {

    switch(name) {
        case "Stop": return <StopIcon/>;
        case "PlayArrow": return <PlayArrowIcon/>;
        case "Info": return <InfoIcon/>;
        case "Storage": return <StorageIcon/>;
        default: return null;
    }
}
