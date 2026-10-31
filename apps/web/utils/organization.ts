/**
 * Calculate organization seats information
 */
export function calculateSeats(organization: {
	members?: { id: string }[];
	invites?: { id: string }[];
}) {
	const memberCount = organization?.members?.length ?? 0;
	const pendingInvitesCount = organization?.invites?.length ?? 0;
	const totalUsedSeats = memberCount + pendingInvitesCount;

	return {
		memberCount,
		pendingInvitesCount,
		totalUsedSeats,
	};
}
