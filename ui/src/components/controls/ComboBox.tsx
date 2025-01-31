import { ReactNode } from "react";
import { MenuItemProps } from "../../utils/types";
import Menu from "./Menu";
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore';

type ComboBoxProps = {
    items: MenuItemProps[];
    children: ReactNode;
    className?: string;
    selected?: string;
}

export default function ComboBox({ items, children, selected, className }: ComboBoxProps) {
    return <Menu popupId="orgs_menu" items={items} align="left" selected={selected}><div className={className} tabIndex={0}><div>{children}</div><UnfoldMoreIcon /></div></Menu>
}
