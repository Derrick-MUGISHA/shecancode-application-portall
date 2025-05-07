"use client";

import Link from "next/link";
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
  // Filter links by position
  const startLink = breadCrumLinks.find(link => link.position === "start") || {
    label: "Dashboard",
    link: "/admin",
    position: "start"
  };
  const middleLinks = breadCrumLinks.filter(link => link.position === "middle");
  const endLink = breadCrumLinks.find(link => link.position === "end");

  return (
    <Breadcrumb>
      <BreadcrumbList className="container mx-auto py-2 px-4 flex items-center justify-start w-full">
        {/* Start Link (Dashboard) */}
        <BreadcrumbItem>
          <BreadcrumbLink>
            <Link className="hover:text-black" href={startLink.link}>{startLink.label}</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>

        {/* Middle Links */}
        {middleLinks.length > 0 && (
          <div className="flex items-center">
            <BreadcrumbSeparator />
            {middleLinks.map((link, index) => (
              <div key={index} className="flex items-center pl-2 gap-2">
                <BreadcrumbItem>
                  <BreadcrumbLink>
                    <Link href={link.link}>{link.label}</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                {index < middleLinks.length - 1 && <BreadcrumbSeparator />}
              </div>
            ))}
          </div>
        )}

        {/* End Link */}
        {endLink && (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage className="text-black">{endLink.label}</BreadcrumbPage>
            </BreadcrumbItem>
          </>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  );
}