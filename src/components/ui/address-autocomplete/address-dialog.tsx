
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type React from "react";
import { type FormEvent, useEffect, useState } from "react";
import { type ZodError, z } from "zod";
import type { AddressType } from ".";
import { Loader2 } from "lucide-react";

interface AddressDialogProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  address: AddressType;
  setAddress: (address: AddressType) => void;
  adrAddress: string;
  dialogTitle: string;
  isLoading: boolean;
  children: React.ReactNode;
}

interface AddressFields {
  address1?: string;
  address2?: string;
  city?: string;
  region?: string;
  postalCode?: string;
}

export function createAddressSchema(address: AddressFields) {
  let schema = {};

  if (address.address1 !== "") {
    schema = {
      ...schema,
      address1: z.string().min(1, {
        message: "Address line 1 is required",
      }),
    };
  }

  schema = {
    ...schema,
    address2: z.string().optional(),
  };

  if (address.city !== "") {
    schema = {
      ...schema,
      city: z.string().min(1, {
        message: "City is required",
      }),
    };
  }

  if (address.region !== "") {
    schema = {
      ...schema,
      region: z.string().min(1, {
        message: "State is required",
      }),
    };
  }

  if (address.postalCode !== "") {
    schema = {
      ...schema,
      postalCode: z.string().min(1, {
        message: "Postal code is required",
      }),
    };
  }

  return z.object(schema);
}

export default function AddressDialog(props: AddressDialogProps) {
  const {
    children,
    dialogTitle,
    open,
    setOpen,
    address,
    setAddress,
    adrAddress,
    isLoading,
  } = props;

  const [address1, setAddress1] = useState("");
  const [address2, setAddress2] = useState("");
  const [city, setCity] = useState("");
  const [region, setRegion] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [errorMap, setErrorMap] = useState<Record<string, string>>({});

  const addressSchema = createAddressSchema({
    address1: address.address1,
    address2: address.address2,
    city: address.city,
    region: address.region,
    postalCode: address.postalCode,
  });

  function updateAndFormatAddress(
    addressString: string,
    addressComponents: {
      "street-address": string;
      address2: string;
      locality: string;
      region: string;
      "postal-code": string;
    },
  ) {
    let updatedAddressString = addressString;

    Object.entries(addressComponents).forEach(([key, value]) => {
      if (key !== "address2") {
        const regex = new RegExp(`(<span class="${key}">)[^<]*(</span>)`, "g");
        updatedAddressString = updatedAddressString.replace(
          regex,
          `$1${value}$2`,
        );
      }
    });

    updatedAddressString = updatedAddressString.replace(/<\/?span[^>]*>/g, "");

    if (addressComponents.address2) {
      const address1Regex = new RegExp(
        `${addressComponents["street-address"]}`,
      );
      updatedAddressString = updatedAddressString.replace(
        address1Regex,
        `${addressComponents["street-address"]}, ${addressComponents.address2}`,
      );
    }

    updatedAddressString = updatedAddressString
      .replace(/,\s*,/g, ",")
      .trim()
      .replace(/\s\s+/g, " ")
      .replace(/,\s*$/, "");

    return updatedAddressString;
  }

  const handleSave = (e: FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      addressSchema.parse({
        address1,
        address2,
        city,
        region,
        postalCode,
      });
    } catch (error) {
      const zodError = error as ZodError;
      const errorMap = zodError.flatten().fieldErrors;

      setErrorMap({
        address1: errorMap.address1?.[0] ?? "",
        address2: errorMap.address2?.[0] ?? "",
        city: errorMap.city?.[0] ?? "",
        region: errorMap.region?.[0] ?? "",
        postalCode: errorMap.postalCode?.[0] ?? "",
      });

      return;
    }

    if (
      address2 !== address.address2 ||
      postalCode !== address.postalCode ||
      address1 !== address.address1 ||
      city !== address.city ||
      region !== address.region
    ) {
      const newFormattedAddress = updateAndFormatAddress(adrAddress, {
        "street-address": address1,
        address2,
        locality: city,
        region,
        "postal-code": postalCode,
      });

      setAddress({
        ...address,
        city,
        region,
        address2,
        address1,
        postalCode,
        formattedAddress: newFormattedAddress,
      });
    }
    setOpen(false);
  };

  useEffect(() => {
    setAddress1(address.address1);
    setAddress2(address.address2 || "");
    setPostalCode(address.postalCode);
    setCity(address.city);
    setRegion(address.region);

    if (!open) {
      setErrorMap({});
    }
  }, [address, open]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="bg-[#111111] border-[#1f1f23] text-white focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0">
        <DialogHeader>
          <DialogTitle className="text-white">{dialogTitle}</DialogTitle>
          <DialogDescription className="text-gray-400">
            Edit the address details below. You can modify each field as needed.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="h-52 flex items-center justify-center">
            <Loader2 className="size-6 animate-spin text-white" />
          </div>
        ) : (
          <form onSubmit={handleSave}>
            <div className="space-y-4 py-7">
              <div className="space-y-0.5">
                <Label htmlFor="address1" className="text-gray-300">Address line 1</Label>
                <Input
                  value={address1}
                  onChange={(e) => setAddress1(e.currentTarget.value)}
                  disabled={address?.address1 === ""}
                  id="address1"
                  name="address1"
                  placeholder="Address line 1"
                  className="bg-[#0a0a0a] border-[#1f1f23] text-white"
                />
                {errorMap.address1 && (
                  <div className="pt-1 text-sm text-red-500">
                    {errorMap.address1}
                  </div>
                )}
              </div>

              <div className="space-y-0.5">
                <Label htmlFor="address2" className="text-gray-300">
                  Address line 2{" "}
                  <span className="text-xs text-gray-500">
                    (Optional)
                  </span>
                </Label>
                <Input
                  value={address2}
                  onChange={(e) => setAddress2(e.currentTarget.value)}
                  disabled={address?.address1 === ""}
                  id="address2"
                  name="address2"
                  placeholder="Address line 2"
                  className="bg-[#0a0a0a] border-[#1f1f23] text-white"
                />
              </div>

              <div className="flex gap-4">
                <div className="flex-1 space-y-0.5">
                  <Label htmlFor="city" className="text-gray-300">City</Label>
                  <Input
                    value={city}
                    onChange={(e) => setCity(e.currentTarget.value)}
                    disabled={address?.city === ""}
                    id="city"
                    name="city"
                    placeholder="City"
                    className="bg-[#0a0a0a] border-[#1f1f23] text-white"
                  />
                  {errorMap.city && (
                    <div className="pt-1 text-sm text-red-500">
                      {errorMap.city}
                    </div>
                  )}
                </div>
                <div className="flex-1 space-y-0.5">
                  <Label htmlFor="region" className="text-gray-300">State / Province / Region</Label>
                  <Input
                    value={region}
                    onChange={(e) => setRegion(e.currentTarget.value)}
                    disabled={address?.region === ""}
                    id="region"
                    name="region"
                    placeholder="Region"
                    className="bg-[#0a0a0a] border-[#1f1f23] text-white"
                  />
                  {errorMap.region && (
                    <div className="pt-1 text-sm text-red-500">
                      {errorMap.region}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-1 space-y-0.5">
                  <Label htmlFor="postalCode" className="text-gray-300">Postal Code</Label>
                  <Input
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.currentTarget.value)}
                    disabled={address?.postalCode === ""}
                    id="postalCode"
                    name="postalCode"
                    placeholder="Postal Code"
                    className="bg-[#0a0a0a] border-[#1f1f23] text-white"
                  />
                  {errorMap.postalCode && (
                    <div className="pt-1 text-sm text-red-500">
                      {errorMap.postalCode}
                    </div>
                  )}
                </div>
                <div className="flex-1 space-y-0.5">
                  <Label htmlFor="country" className="text-gray-300">Country</Label>
                  <Input
                    value={address?.country}
                    id="country"
                    disabled
                    name="country"
                    placeholder="Country"
                    className="bg-[#0a0a0a] border-[#1f1f23] text-white"
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                onClick={() => setOpen(false)}
                variant="outline"
                className="border-[#333] bg-[#1a1a1a] hover:bg-[#2a2a2a] text-gray-300 hover:text-white"
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                className="bg-neutral-50 hover:bg-[#d6d6d6] text-neutral-950"
              >
                Save
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
