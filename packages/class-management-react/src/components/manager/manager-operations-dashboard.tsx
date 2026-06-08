import { useState } from "react";

import { AttendanceSession } from "./attendance-session";
import { MembershipGrants } from "./membership-grants";
import { MembershipTypes } from "./membership-types";

export function ManagerOperationsDashboard({ refreshKey = 0 }: { refreshKey?: number }) {
	const [membershipRefreshKey, setMembershipRefreshKey] = useState(0);

	function refreshMembershipViews() {
		setMembershipRefreshKey((value) => value + 1);
	}

	return (
		<section className="mt-6 grid gap-5">
			<MembershipTypes refreshKey={membershipRefreshKey} onChanged={refreshMembershipViews} />
			<MembershipGrants refreshKey={membershipRefreshKey} onChanged={refreshMembershipViews} />
			<AttendanceSession refreshKey={refreshKey} />
		</section>
	);
}
