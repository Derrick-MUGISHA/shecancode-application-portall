"use client";

import Link from "next/link";
import { Fragment, useEffect, useState } from "react";
import { applicationReturnHref } from "@/lib/admin-navigation";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export type BreadCrumLinkTypes = {
  label: string;
  link: string;
  position: "start" | "middle" | "end";
};

interface BreadcrumbWithCustomSeparatorProps {
  breadCrumLinks: BreadCrumLinkTypes[];
}

export default function BreadcrumbWithCustomSeparator({ breadCrumLinks }: BreadcrumbWithCustomSeparatorProps) {
  const [returnHref, setReturnHref] = useState("/admin/applications");
  useEffect(() => setReturnHref(applicationReturnHref(new URLSearchParams(window.location.search).get("from"))), []);
  // Filter links by position
  const startLink = breadCrumLinks.find(link => link.position === "start") || {
    label: "Dashboard",
    link: "/admin",
    position: "start"
  };
  const middleLinks = breadCrumLinks.filter(link => link.position === "middle");
  const endLink = breadCrumLinks.find(link => link.position === "end");

  const links = [startLink, ...middleLinks, ...(endLink ? [endLink] : [])];
  return (
    <Breadcrumb>
      <BreadcrumbList className="container mx-auto flex w-full flex-wrap items-center justify-start px-4 py-4 text-sm">
        {links.map((link,index) => <Fragment key={`${link.label}-${index}`}>
          {index > 0 && <BreadcrumbSeparator />}
          <BreadcrumbItem>{index === links.length - 1 ? <BreadcrumbPage className="text-slate-800">{link.label}</BreadcrumbPage> : <BreadcrumbLink asChild><Link href={link.link === "/admin/applications" ? returnHref : link.link}>{link.label}</Link></BreadcrumbLink>}</BreadcrumbItem>
        </Fragment>)}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
