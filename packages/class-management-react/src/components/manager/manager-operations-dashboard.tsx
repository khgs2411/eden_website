import { useState } from "react";

import { AttendanceSession } from "./attendance-session";
import { MembershipGrants } from "./membership-grants";
import { MembershipTypes } from "./membership-types";

export type ManagerOperationsDashboardView = "all" | "memberships" | "attendance";

export function ManagerOperationsDashboard({ refreshKey = 0, view = "all" }: { refreshKey?: number; view?: ManagerOperationsDashboardView }) {
	const [membershipRefreshKey, setMembershipRefreshKey] = useState(0);

	function refreshMembershipViews() {
		setMembershipRefreshKey((value) => value + 1);
	}

	return (
		<section className="mt-6 grid gap-5">
			{view === "all" || view === "memberships" ? <MembershipTypes refreshKey={membershipRefreshKey} onChanged={refreshMembershipViews} /> : null}
			{view === "all" || view === "memberships" ? <MembershipGrants refreshKey={membershipRefreshKey} onChanged={refreshMembershipViews} /> : null}
			{view === "all" || view === "attendance" ? <AttendanceSession refreshKey={refreshKey} /> : null}
		</section>
	);
}
