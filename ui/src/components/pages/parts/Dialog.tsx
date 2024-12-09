// (C) Copyright 2024 Dassault Systemes SE.  All Rights Reserved.

import Button from '../../controls/Button';
import DialogMaterial from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import { TempAny } from '../../../utils/types';
import { Component, ReactNode } from 'react';

let s_instance: Dialog | null = null;

interface IProps {
}

interface DialogProps {
    buttons?: TempAny
    title?: string
    body?: ReactNode,
    resolve: TempAny,
    reject: TempAny
}

interface IProps { }

interface IState {
    dialogs?: DialogProps[]
}

export default class Dialog extends Component<IProps, IState> {
    state = {
        dialogs: []
    }

    componentDidMount() {
        s_instance = this;
    }

    static confirm = (title: string, body: ReactNode, t: any) => {
        return new Promise((resolve, reject) => {
            if (s_instance === null) {
                reject("Dialog not initialized");
                return;
            }
            s_instance.setState({
                dialogs: [...s_instance.state.dialogs, {
                    title,
                    body,
                    buttons: [
                        { id: "yes", label: t("button.yes") },
                        { id: "no", label: t("button.no") }
                    ],
                    resolve,
                    reject
                }]
            });
        });
    }

    static ok = (title: string, body: ReactNode, t: any) => {
        return new Promise((resolve, reject) => {
            if (s_instance === null) {
                reject("Dialog not initialized");
                return;
            }
            s_instance.setState({
                dialogs: [...s_instance.state.dialogs, {
                    title,
                    body,
                    buttons: [
                        { id: "ok", label: t("button.ok") }
                    ],
                    resolve,
                    reject
                }]
            });
        });
    }

    handleClose(button: string) {
        let dialogs = [...this.state.dialogs];
        const lastItem: TempAny = dialogs.pop();
        this.setState({ dialogs })
        lastItem.resolve(button);
    }

    render() {
        return this.state.dialogs.map((dialog: DialogProps, index: number) => {
            return <DialogMaterial key={index}
                open={true}
                onClose={() => this.handleClose(dialog.buttons[dialog.buttons.length - 1])}
            >
                <DialogTitle>{dialog.title}</DialogTitle>
                <DialogContent>
                    <DialogContentText>{dialog.body}</DialogContentText>
                </DialogContent>
                <DialogActions>
                    {dialog.buttons.map((button: { id: string, label: string }) => <Button key={button.id} data-testid={"dialog_button_" + button.id} onClick={() => this.handleClose(button.id)}>{button.label}</Button>)}
                </DialogActions>
            </DialogMaterial>;
        });
    }
}
