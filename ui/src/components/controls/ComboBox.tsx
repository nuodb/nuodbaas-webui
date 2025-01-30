import { ReactNode } from "react";
import { MenuItemProps } from "../../utils/types";
import Menu from "./Menu";

type ComboBoxProps = {
    items: MenuItemProps[];
    children: ReactNode;
    className?: string;
    selected?: string;
}

export default function ComboBox({ items, children, selected, className }: ComboBoxProps) {
    return <Menu popupId="orgs_menu" items={items} align="left" selected={selected}><div className={className} tabIndex={0}>{children}</div></Menu>
}
