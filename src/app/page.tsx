"use client"
import Searchbar from "@/components/searchbar";

export default function Home() {
  
  return (
    <div className="flex h-screen w-full">
      {/* <Sidetaskbar/> */}
      <div className="bg-[#1b1c1e] flex w-full flex-col items-center">
        <Searchbar/>
      </div>
    </div>
  );
}
