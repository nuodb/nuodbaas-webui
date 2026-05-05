// (C) Copyright 2024-2025 Dassault Systemes SE.  All Rights Reserved.

import Button from '../../controls/Button';
import DialogMaterial from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import { TempAny } from '../../../utils/types';
import { Component, ReactNode } from 'react';

let s_instance: Dialog | null = null;

interface IProps {
}

type MaxWidthType = "xs" | "sm" | "md" | "lg" | "xl";

interface DialogProps {
    buttons: ButtonProps[];
    title?: string;
    body?: ReactNode;
    maxWidth?: MaxWidthType;
    resolve: TempAny;
    reject: TempAny;
}

interface IProps { }

interface IState {
    dialogs?: DialogProps[]
}

type ButtonProps = {
    id: string,
    label: string;
};

export default class Dialog extends Component<IProps, IState> {
    state = {
        dialogs: []
    }

    componentDidMount() {
        s_instance = this;
    }

    static confirm = (title: string, body: ReactNode, t: any, maxWidth?: MaxWidthType) => {
        return Dialog.show(title, body, [
            { id: "yes", label: t("button.yes") },
            { id: "no", label: t("button.no") }
        ], t, maxWidth);
    }

    static okCancel = (title: string, body: ReactNode, t: any, maxWidth?: MaxWidthType) => {
        return Dialog.show(title, body, [
            { id: "ok", label: t("button.ok") },
            { id: "cancel", label: t("button.cancel") }
        ], t, maxWidth);
    }

    static ok = (title: string, body: ReactNode, t: any, maxWidth?: MaxWidthType) => {
        return Dialog.show(title, body, [
            { id: "ok", label: t("button.ok") }
        ], t, maxWidth);
    }

    static show = (title: string, body: ReactNode, buttons: ButtonProps[], t: any, maxWidth?: MaxWidthType) => {
        return new Promise((resolve, reject) => {
            if (s_instance === null) {
                reject("Dialog not initialized");
                return;
            }
            s_instance.setState({
                dialogs: [...s_instance.state.dialogs, {
                    title,
                    body,
                    buttons,
                    maxWidth,
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

    static close = (buttonId: string) => {
        if (s_instance === null) {
            return;
        }
        s_instance.handleClose(buttonId);
    }

    render() {
        return this.state.dialogs.map((dialog: DialogProps, index: number) => {
            return <DialogMaterial key={index} maxWidth={dialog.maxWidth}
                open={true}
            >
                <DialogTitle>{dialog.title}</DialogTitle>
                {dialog.buttons.length > 0 ? <>
                <DialogContent>
                    {dialog.body}
                </DialogContent>
                <DialogActions>
                        {dialog.buttons.map((button: ButtonProps) => (
                            <Button
                                key={button.id}
                                data-testid={"dialog_button_" + button.id}
                                onClick={() => {
                                    this.handleClose(button.id);
                                }}
                            >{button.label}</Button>
                        ))}
                </DialogActions>
                </> : dialog.body}
            </DialogMaterial>;
        });
    }
}
