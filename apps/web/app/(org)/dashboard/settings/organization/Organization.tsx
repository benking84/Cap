"use client";

import {
	useCallback,
	useRef,
	useState,
} from "react";
import { toast } from "sonner";
import { useDashboardContext } from "@/app/(org)/dashboard/Contexts";
import CapSettingsCard from "./components/CapSettingsCard";
import DeleteOrg from "./components/DeleteOrg";
import { InviteDialog } from "./components/InviteDialog";
import { MembersCard } from "./components/MembersCard";
import { OrganizationDetailsCard } from "./components/OrganizationDetailsCard";

export const Organization = () => {
	const { activeOrganization, user } = useDashboardContext();
	const isOwner = user?.id === activeOrganization?.organization.ownerId;
	const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
	const ownerToastShown = useRef(false);

	const showOwnerToast = useCallback(() => {
		if (!ownerToastShown.current) {
			toast.error("Only the owner can make changes");
			ownerToastShown.current = true;
			setTimeout(() => {
				ownerToastShown.current = false;
			}, 3000);
		}
	}, []);

	return (
		<form className="flex flex-col gap-6">
			<div className="flex flex-col gap-6 justify-center items-stretch xl:flex-row">
				<OrganizationDetailsCard />
			</div>

			<div>
				<CapSettingsCard />
			</div>

			<MembersCard
				isOwner={isOwner}
				showOwnerToast={showOwnerToast}
				setIsInviteDialogOpen={setIsInviteDialogOpen}
			/>

			<InviteDialog
				isOpen={isInviteDialogOpen}
				setIsOpen={setIsInviteDialogOpen}
				isOwner={isOwner}
				showOwnerToast={showOwnerToast}
			/>

			<DeleteOrg />
		</form>
	);
};
