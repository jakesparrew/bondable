"use client";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Delete, Loader2, Pencil } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import AddressDialog from "./address-dialog";
import { Command as CommandPrimitive } from "cmdk";
import { useDebounce } from "@/hooks/utils/use-debounce";
import {
  getPlaceAutocomplete,
  getPlaceDetailsById,
  type PlacePrediction,
} from "@/lib/places-api";

export interface AddressType {
  address1: string;
  address2: string;
  formattedAddress: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
  lat: number;
  lng: number;
}

interface AddressAutoCompleteProps {
  address: AddressType;
  setAddress: (address: AddressType) => void;
  searchInput: string;
  setSearchInput: (searchInput: string) => void;
  dialogTitle: string;
  showInlineError?: boolean;
  placeholder?: string;
  readOnly?: boolean;
  className?: string;
}

// Function to convert place details to AddressType
const convertPlaceDetailsToAddress = async (
  placeId: string
): Promise<AddressType | null> => {
  try {
    const placeDetails = await getPlaceDetailsById(placeId);

    if (!placeDetails) {
      return null;
    }

    const addressComponents = placeDetails.address_components || [];

    let address1 = "";
    let city = "";
    let region = "";
    let postalCode = "";
    let country = "";

    addressComponents.forEach((component) => {
      const types = component.types;

      if (types.includes("street_number")) {
        address1 = component.long_name + " " + address1;
      }
      if (types.includes("route")) {
        address1 += component.long_name;
      }
      if (types.includes("locality")) {
        city = component.long_name;
      }
      if (types.includes("administrative_area_level_1")) {
        region = component.short_name;
      }
      if (types.includes("postal_code")) {
        postalCode = component.long_name;
      }
      if (types.includes("country")) {
        country = component.short_name;
      }
    });

    const addressData: AddressType = {
      address1: address1.trim(),
      address2: "",
      formattedAddress: placeDetails.formatted_address || "",
      city,
      region,
      postalCode,
      country,
      lat: placeDetails.geometry?.location?.lat || 0,
      lng: placeDetails.geometry?.location?.lng || 0,
    };

    return addressData;
  } catch (error) {
    console.error("Error converting place details:", error);
    return null;
  }
};

export default function AddressAutoComplete(props: AddressAutoCompleteProps) {
  const {
    address,
    setAddress,
    dialogTitle,
    showInlineError = true,
    searchInput,
    setSearchInput,
    placeholder,
    readOnly = false,
    className = "",
  } = props;

  const [selectedPlaceId, setSelectedPlaceId] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string>("");

  useEffect(() => {
    if (selectedPlaceId) {
      setIsLoading(true);
      setApiError("");

      convertPlaceDetailsToAddress(selectedPlaceId)
        .then((placeData) => {
          if (placeData) {
            setAddress(placeData);
          } else {
            setApiError(
              "Unable to fetch address details. Please check your Google Places API configuration."
            );
          }
          setIsLoading(false);
        })
        .catch((error) => {
          console.error("Error fetching place details:", error);
          setApiError("Error fetching address details.");
          setIsLoading(false);
        });
    }
  }, [selectedPlaceId, setAddress]);

  if (apiError) {
    return (
      <div className="space-y-2">
        <Input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder={placeholder || "Enter address manually"}
          className="bg-[#0a0a0a] border-[#1f1f23] text-white"
        />
        <div className="text-sm text-yellow-500 bg-yellow-500/10 p-2 rounded border border-yellow-500/20">
          Google Places API unavailable. Please enter address manually or check
          API key configuration.
        </div>
      </div>
    );
  }

  return (
    <>
      {readOnly ? (
        <Input
          value={address?.formattedAddress}
          readOnly
          className={className}
        />
      ) : selectedPlaceId !== "" || address.formattedAddress ? (
        <div className="flex items-center gap-2">
          <Input
            value={address?.formattedAddress}
            readOnly
            className={className}
          />
          <AddressDialog
            isLoading={isLoading}
            dialogTitle={dialogTitle}
            adrAddress={address.formattedAddress}
            address={address}
            setAddress={setAddress}
            open={isOpen}
            setOpen={setIsOpen}
          >
            <Button
              disabled={isLoading}
              size="icon"
              variant="outline"
              className="shrink-0 border-[#333] bg-[#1a1a1a] hover:bg-[#2a2a2a] text-gray-300 hover:text-white"
            >
              <Pencil className="size-4" />
            </Button>
          </AddressDialog>
          <Button
            type="button"
            onClick={() => {
              setSelectedPlaceId("");
              setAddress({
                address1: "",
                address2: "",
                formattedAddress: "",
                city: "",
                region: "",
                postalCode: "",
                country: "",
                lat: 0,
                lng: 0,
              });
            }}
            size="icon"
            variant="outline"
            className="shrink-0 border-[#333] bg-[#1a1a1a] hover:bg-[#2a2a2a] text-gray-300 hover:text-white"
          >
            <Delete className="size-4" />
          </Button>
        </div>
      ) : (
        <AddressAutoCompleteInput
          searchInput={searchInput}
          setSearchInput={setSearchInput}
          selectedPlaceId={selectedPlaceId}
          setSelectedPlaceId={setSelectedPlaceId}
          setIsOpenDialog={setIsOpen}
          showInlineError={showInlineError}
          placeholder={placeholder}
        />
      )}
    </>
  );
}

interface CommonProps {
  selectedPlaceId: string;
  setSelectedPlaceId: (placeId: string) => void;
  setIsOpenDialog: (isOpen: boolean) => void;
  showInlineError?: boolean;
  searchInput: string;
  setSearchInput: (searchInput: string) => void;
  placeholder?: string;
}

function AddressAutoCompleteInput(props: CommonProps) {
  const {
    setSelectedPlaceId,
    selectedPlaceId,
    setIsOpenDialog,
    showInlineError,
    searchInput,
    setSearchInput,
    placeholder,
  } = props;

  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      close();
    }
  };

  const debouncedSearchInput = useDebounce(searchInput, 500);

  useEffect(() => {
    if (debouncedSearchInput && debouncedSearchInput.length > 2) {
      setIsLoading(true);
      getPlaceAutocomplete(debouncedSearchInput)
        .then((results) => {
          setPredictions(results);
          setIsLoading(false);
        })
        .catch((error) => {
          console.error("Error fetching predictions:", error);
          setPredictions([]);
          setIsLoading(false);
        });
    } else {
      setPredictions([]);
    }
  }, [debouncedSearchInput]);

  return (
    <Command
      shouldFilter={false}
      onKeyDown={handleKeyDown}
      className="overflow-visible !rounded-lg"
    >
      <div className="flex w-full items-center justify-between border border-[#1f1f23] bg-[#0a0a0a] ring-offset-background text-sm focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 rounded-lg ">
        <CommandPrimitive.Input
          value={searchInput}
          onValueChange={setSearchInput}
          onBlur={close}
          onFocus={open}
          placeholder={placeholder || "Enter address"}
          className="w-full p-[0.57rem] rounded-lg outline-none bg-transparent text-white placeholder:text-gray-500"
        />
      </div>
      {searchInput !== "" && !isOpen && !selectedPlaceId && showInlineError && (
        <div className="pt-1 text-sm text-red-500">
          Select a valid address from the list
        </div>
      )}

      {isOpen && (
        <div className="relative animate-in fade-in-0 zoom-in-95 h-auto">
          <CommandList>
            <div className="absolute top-1.5 z-50 w-full">
              <CommandGroup className="relative h-auto z-50 min-w-[8rem] overflow-hidden rounded-md border border-[#1f1f23] shadow-md bg-[#111111]">
                {isLoading ? (
                  <div className="h-28 flex items-center justify-center">
                    <Loader2 className="size-6 animate-spin text-white" />
                  </div>
                ) : (
                  <>
                    {predictions.map((prediction) => (
                      <CommandPrimitive.Item
                        value={prediction.description}
                        onSelect={() => {
                          setSearchInput("");
                          setSelectedPlaceId(prediction.place_id);
                          setIsOpenDialog(true);
                        }}
                        className="flex select-text flex-col cursor-pointer gap-0.5 h-max p-2 px-3 rounded-md aria-selected:bg-[#1f1f23] aria-selected:text-white hover:bg-[#1f1f23] hover:text-white items-start text-white"
                        key={prediction.place_id}
                        onMouseDown={(e) => e.preventDefault()}
                      >
                        {prediction.description}
                      </CommandPrimitive.Item>
                    ))}
                  </>
                )}

                <CommandEmpty>
                  {!isLoading && predictions.length === 0 && (
                    <div className="py-4 flex items-center justify-center text-gray-400">
                      {searchInput === ""
                        ? "Please enter an address"
                        : "No address found"}
                    </div>
                  )}
                </CommandEmpty>
              </CommandGroup>
            </div>
          </CommandList>
        </div>
      )}
    </Command>
  );
}
