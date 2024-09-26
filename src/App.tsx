import { createSignal, type Component, For } from "solid-js";

interface AudioDevice {
    id: string;
    name: string;
}

const App: Component = () => {
    const [isRecording, setIsRecording] = createSignal<boolean>(false);
    const [microphonePermissionState, setMicrophonePermissionState] = createSignal<"granted" | "prompt" | "denied">("denied");
    const [availableAudioDevices, setAvailableAudioDevices] = createSignal<AudioDevice[]>([]);
    const [selectedAudioDevice, setSelectedAudioDevice] = createSignal<string | undefined>(undefined);
    const [savedAudios, setSavedAudios] = createSignal<any[][]>([]);

    let mediaRecorder: any = undefined;

    // Get available audio devices
    function getAvailableAudioDevices(): Promise<any[]> {
        return new Promise<any[]>((resolve) => {
            navigator.mediaDevices.enumerateDevices().then((devices) => {
                const availableDevices = devices
                    .filter((d) => d.kind === "audioinput")
                    .map((d) => {
                        return { id: d.deviceId, name: d.label };
                    });
                resolve(availableDevices);
            });
        });
    }

    // Handle request permission
    function handleRequestPermission() {
        navigator.mediaDevices.getUserMedia({ audio: true, video: false }).then((stream) => {
            stream.getTracks().forEach(function (track) {
                track.stop();
            });
        });
    }

    // Handle permission state
    function handlePermissionState(state: "granted" | "prompt" | "denied") {
        setMicrophonePermissionState(state);
        if (state == "granted") {
            getAvailableAudioDevices().then((devices) => {
                setAvailableAudioDevices(devices);
                setSelectedAudioDevice(devices.find((device) => device.id === "default")?.id);
            });
        }
        if (state === "denied") {
            handleRequestPermission();
        }
    }

    // Handle on change audio device
    function handleClickSelectAudioDevice(id: string) {
        setSelectedAudioDevice(id);
    }

    // Handle on click start recording
    function handleClickStartRecord() {
        if (selectedAudioDevice()) {
            setIsRecording(true);
            const audio = selectedAudioDevice()!.length > 0 ? { deviceId: selectedAudioDevice() } : true;

            navigator.mediaDevices.getUserMedia({ audio: audio, video: false }).then((stream) => {
                const options = { mimeType: "audio/webm" };
                const recordedChunks: any[] = [];
                mediaRecorder = new MediaRecorder(stream, options);

                mediaRecorder.addEventListener("dataavailable", function (e: any) {
                    if (e.data.size > 0) recordedChunks.push(e.data);
                });

                mediaRecorder.addEventListener("stop", function () {
                    setSavedAudios((prev) => [...prev, recordedChunks]);
                    stream.getTracks().forEach(function (track) {
                        track.stop();
                    });
                });

                mediaRecorder.start();
            });
        }
    }

    // Handle on click stop recording
    function handleClickStopRecord() {
        setIsRecording(false);
        if (mediaRecorder) mediaRecorder.stop();
    }

    // Handle download audio
    function handleDownloadAudio(index: number) {
        const recordedChunks = savedAudios()[index];
        const a = document.createElement("a");
        a.href = URL.createObjectURL(new Blob(recordedChunks));
        a.download = `Audio ${index + 1}.wav`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        a.remove();
    }

    // Get audio URL from saved chunks
    function getAudioRef(index: number) {
        const recordedChunks = savedAudios()[index];
        return URL.createObjectURL(new Blob(recordedChunks));
    }

    // handle delete audio
    function handleDeleteAudio(index: number) {
        setSavedAudios((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
    }

    // Check permissions
    navigator.permissions.query({ name: "microphone" as PermissionName }).then(function (queryResult) {
        +handlePermissionState(queryResult.state);
        queryResult.onchange = function (onChangeResult) {
            if (onChangeResult.target) {
                handlePermissionState((onChangeResult.target as PermissionStatus).state);
            }
        };
    });

    return (
        <div class="w-screen h-screen flex items-start justify-center">
            <div class="flex flex-col gap-8 mt-40">
                <h1 class="text-4xl font-bold text-gray-800">Javascript Audio Manager</h1>
                <div class="flex items-center justify-between">
                    {microphonePermissionState() === "granted" && (
                        <div class="flex items-center gap-4 bg-green-800 w-fit rounded-full py-1 px-3 text-white">
                            <svg
                                class="h-5 w-5"
                                fill="currentColor"
                                stroke-width="0"
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 512 512"
                                style="overflow: visible;"
                            >
                                <path d="M256 512a256 256 0 1 0 0-512 256 256 0 1 0 0 512zm113-303L241 337c-9.4 9.4-24.6 9.4-33.9 0l-64-64c-9.4-9.4-9.4-24.6 0-33.9s24.6-9.4 33.9 0l47 47L335 175c9.4-9.4 24.6-9.4 33.9 0s9.4 24.6 0 33.9z"></path>
                            </svg>
                            <p class="text-sm font-medium">Has microphone permission</p>
                        </div>
                    )}
                    {microphonePermissionState() === "granted" && isRecording() && (
                        <div class="animate-pulse flex items-center gap-4 bg-red-800 w-fit rounded-full py-1 px-3 text-white">
                            <svg
                                class="h-5 w-5"
                                fill="currentColor"
                                stroke-width="0"
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 16 16"
                                style="overflow: visible;"
                            >
                                <path d="M8 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"></path>
                                <path
                                    fill-rule="evenodd"
                                    d="M8.6 1c1.6.1 3.1.9 4.2 2 1.3 1.4 2 3.1 2 5.1 0 1.6-.6 3.1-1.6 4.4-1 1.2-2.4 2.1-4 2.4-1.6.3-3.2.1-4.6-.7-1.4-.8-2.5-2-3.1-3.5C.9 9.2.8 7.5 1.3 6c.5-1.6 1.4-2.9 2.8-3.8C5.4 1.3 7 .9 8.6 1zm.5 12.9c1.3-.3 2.5-1 3.4-2.1.8-1.1 1.3-2.4 1.2-3.8 0-1.6-.6-3.2-1.7-4.3-1-1-2.2-1.6-3.6-1.7-1.3-.1-2.7.2-3.8 1-1.1.8-1.9 1.9-2.3 3.3-.4 1.3-.4 2.7.2 4 .6 1.3 1.5 2.3 2.7 3 1.2.7 2.6.9 3.9.6z"
                                    clip-rule="evenodd"
                                ></path>
                            </svg>
                            <p class="text-sm font-medium">Recording</p>
                        </div>
                    )}
                </div>

                {microphonePermissionState() === "prompt" && (
                    <div class="flex items-center gap-4 bg-red-800 w-fit rounded-full py-1 px-3 text-white">
                        <svg
                            class="h-5 w-5"
                            fill="currentColor"
                            stroke-width="0"
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 512 512"
                            style="overflow: visible;"
                        >
                            <path d="M256 48C141.31 48 48 141.31 48 256s93.31 208 208 208 208-93.31 208-208S370.69 48 256 48Zm75.31 260.69a16 16 0 1 1-22.62 22.62L256 278.63l-52.69 52.68a16 16 0 0 1-22.62-22.62L233.37 256l-52.68-52.69a16 16 0 0 1 22.62-22.62L256 233.37l52.69-52.68a16 16 0 0 1 22.62 22.62L278.63 256Z"></path>
                        </svg>
                        <p class="text-sm font-medium">Does not have microphone permission yet</p>
                    </div>
                )}
                {microphonePermissionState() === "denied" && (
                    <div class="flex items-center gap-4 bg-red-800 w-fit rounded-full py-1 px-3 text-white">
                        <svg
                            class="h-5 w-5"
                            fill="currentColor"
                            stroke-width="0"
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 512 512"
                            style="overflow: visible;"
                        >
                            <path d="M256 48C141.31 48 48 141.31 48 256s93.31 208 208 208 208-93.31 208-208S370.69 48 256 48Zm75.31 260.69a16 16 0 1 1-22.62 22.62L256 278.63l-52.69 52.68a16 16 0 0 1-22.62-22.62L233.37 256l-52.68-52.69a16 16 0 0 1 22.62-22.62L256 233.37l52.69-52.68a16 16 0 0 1 22.62 22.62L278.63 256Z"></path>
                        </svg>
                        <p class="text-sm font-medium">User declined permission</p>
                    </div>
                )}

                {microphonePermissionState() === "granted" && !isRecording() && (
                    <button
                        type="button"
                        class="rounded-md bg-red-600 px-2.5 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                        onClick={handleClickStartRecord}
                    >
                        Record
                    </button>
                )}
                {microphonePermissionState() === "granted" && isRecording() && (
                    <button
                        type="button"
                        class="rounded-md bg-red-600 px-2.5 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                        onClick={handleClickStopRecord}
                    >
                        Stop
                    </button>
                )}
                {microphonePermissionState() === "prompt" && (
                    <button
                        type="button"
                        class="rounded-md bg-indigo-600 px-2.5 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                        onClick={handleRequestPermission}
                    >
                        Request permission
                    </button>
                )}
                {microphonePermissionState() === "granted" && (
                    <div class="space-y-4 mt-8">
                        <h3 class="text-md font-semibold text-gray-800">Devices</h3>
                        <For each={availableAudioDevices()}>
                            {(audioDevice) => (
                                <label
                                    class={`relative block cursor-pointer rounded-lg border bg-white px-6 py-4 shadow-sm focus:outline-none sm:flex sm:justify-between ${
                                        selectedAudioDevice() === audioDevice.id ? "border-indigo-600 ring-2 ring-indigo-600" : ""
                                    }`}
                                    onClick={() => handleClickSelectAudioDevice(audioDevice.id)}
                                >
                                    <span class="flex items-center">
                                        <span class="flex flex-col text-sm">
                                            <span class="font-medium text-gray-900">{audioDevice.name}</span>
                                            <span class="text-gray-500">
                                                <span class="block sm:inline text-xs">{audioDevice.id}</span>
                                            </span>
                                        </span>
                                    </span>
                                    <span class="pointer-events-none absolute -inset-px rounded-lg border-2" aria-hidden="true"></span>
                                </label>
                            )}
                        </For>
                    </div>
                )}
                {savedAudios().length > 0 && (
                    <div class="space-y-4 mt-8">
                        <h3 class="text-md font-semibold text-gray-800">Audios</h3>
                        <ul
                            role="list"
                            class="divide-y divide-gray-100 overflow-hidden bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl"
                        >
                            <For each={savedAudios()}>
                                {(_, audioIndex) => (
                                    <li class="relative flex justify-between items-center gap-x-6 px-4 py-2 sm:px-6">
                                        <div class="flex gap-x-4 items-center gap-8">
                                            <svg
                                                class="h-4 w-4 text-red-500 cursor-pointer"
                                                fill="currentColor"
                                                stroke-width="0"
                                                xmlns="http://www.w3.org/2000/svg"
                                                viewBox="0 0 448 512"
                                                style="overflow: visible;"
                                                onClick={() => handleDeleteAudio(audioIndex())}
                                            >
                                                <path d="M135.2 17.7 128 32H32C14.3 32 0 46.3 0 64s14.3 32 32 32h384c17.7 0 32-14.3 32-32s-14.3-32-32-32h-96l-7.2-14.3C307.4 6.8 296.3 0 284.2 0H163.8c-12.1 0-23.2 6.8-28.6 17.7zM416 128H32l21.2 339c1.6 25.3 22.6 45 47.9 45h245.8c25.3 0 46.3-19.7 47.9-45L416 128z"></path>
                                            </svg>
                                            <div class="min-w-0 flex-auto">
                                                <p class="text-sm font-semibold leading-6 text-gray-900">{`Audio ${audioIndex() + 1}`}</p>
                                            </div>
                                        </div>
                                        <div class="flex items-center gap-x-4">
                                            <div class="hidden sm:flex sm:flex-col sm:items-end">
                                                <audio src={getAudioRef(audioIndex())} controls></audio>
                                            </div>
                                            <svg
                                                class="cursor-pointer h-5 w-5 flex-none text-gray-400"
                                                fill="none"
                                                stroke-width="2"
                                                stroke="currentColor"
                                                stroke-linecap="round"
                                                stroke-linejoin="round"
                                                viewBox="0 0 24 24"
                                                style="overflow: visible;"
                                                onClick={() => handleDownloadAudio(audioIndex())}
                                            >
                                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"></path>
                                            </svg>
                                        </div>
                                    </li>
                                )}
                            </For>
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
};

export default App;
