import * as React from 'react';
import Button from '@mui/material/Button';
import DialogMaterial from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';

let s_instance = null;

export default class Dialog extends React.Component {
    state = {
        dialogs: []
    }

    componentDidMount() {
        s_instance = this;
    }

    static confirm = (title, body) => {
        return new Promise((resolve, reject) => {
            let dialogs = [...s_instance.state.dialogs];
            dialogs.push({title, body});
            s_instance.setState({dialogs: [...s_instance.state.dialogs, {title, body, buttons: ["yes", "no"], resolve, reject}]});
        });
    }

    handleClose(button) {
        let dialogs = [...this.state.dialogs];
        const lastItem = dialogs.pop();
        this.setState({dialogs})
        lastItem.resolve(button);
    }

    render() {
        return this.state.dialogs.map((dialog,index) => {
            return <DialogMaterial key={index}
                open={true}
                onClose={()=>this.handleClose(dialog.buttons[dialog.buttons.length-1])}
            >
                <DialogTitle>{dialog.title}</DialogTitle>
                <DialogContent>
                <DialogContentText>{dialog.body}</DialogContentText>
                </DialogContent>
                <DialogActions>
                    {dialog.buttons.map(button => <Button key={button} data-testid={"dialog_button_" + button.replaceAll(" ", "_").toLowerCase()} onClick={()=>this.handleClose(button)}>{button}</Button>)}
                </DialogActions>
            </DialogMaterial>;
        });
    }
}
