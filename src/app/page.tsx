'use client'

import Image from 'next/image'
import styles from './page.module.css'
import { useState, useRef, useMemo, useCallback, useEffect } from 'react'
import {
	AddFrame,
	Context,
	createIframeEndpoint,
	FrameClientEvent,
	FrameHost,
	HostEndpoint,
	useExposeToEndpoint,
	ViewProfile,
	ReadyOptions,
} from '@farcaster/frame-host'
import { useMessageHandler } from '../hooks/useMessageHandler'
import {
	useAccount,
	useConnectors,
	useSendTransaction,
	useSignMessage,
} from 'wagmi'
import { config } from './config'
import { getChainId, switchChain } from '@wagmi/core'
import { base, mainnet, sepolia } from 'wagmi/chains'
import { User, useSignIn } from '../contexts/SignInProvider'
import { useSearchParams } from 'next/navigation'

const DEFAULT_FRAME_URL = 'https://frames-v2-demo-lilac.vercel.app/'
// 'https://www.palettes.fun/';
const DEFAULT_FID = 864289
export default function Home() {
	const { address } = useAccount()
	const { signMessage } = useSignMessage()
	const searchParams = useSearchParams()
	const [frameUrl, setFrameUrl] = useState<string | null>(null)
	const [fid, setFid] = useState<number | null>(DEFAULT_FID)
	const [isConnectFlow, setIsConnectFlow] = useState(false)
	const [walletAddress, setWalletAddress] = useState('')
	const [channelUrl, setChannelUrl] = useState<string | null>(null)
	const [isModalOpen, setIsModalOpen] = useState(false)
	// Initialize currentUser directly with a default FID that will be updated from URL params
	const [currentUser, setCurrentUser] = useState<User>({
		fid: 0, // Will be updated from URL params
		username: 'test-user',
		displayName: 'test',
		pfpUrl: 'https://picsum.photos/200/200',
	})
	const [endpoint, setEndpoint] = useState<HostEndpoint | undefined>(undefined)
	const [debug] = useState(true)
	const [frameVisible, setFrameVisible] = useState(false)
	const iframeRef = useRef<HTMLIFrameElement>(null)
	const { data: hash, sendTransaction } = useSendTransaction()
	const [isSignInComplete, setIsSignInComplete] = useState(false)

	// Get URL and FID from search parameters on component mount
	useEffect(() => {
		// Get domain parameter
		const domain = searchParams.get('domain')
		if (domain) {
			setFrameUrl(`https://${domain}`)
		} else {
			setFrameUrl(DEFAULT_FRAME_URL)
		}

		// Get FID parameter
		const fidParam = searchParams.get('fid')
		const parsedFid =
			fidParam && !isNaN(parseInt(fidParam)) ? parseInt(fidParam) : DEFAULT_FID

		// Update both FID state and currentUser with the FID from params
		setFid(parsedFid)
		setCurrentUser((prev) => ({
			...prev,
			fid: parsedFid,
		}))

		// Automatically set frameVisible to true to load frame without clicking button
		setFrameVisible(true)
	}, [searchParams])

	let connectFunc
	let acctFunc

	const walletProvider = useMemo(() => {
		return {
			request: async (...args: any[]) => {
				if (args[0].method === 'eth_requestAccounts') {
					console.log('Frame Host: returned address', address)
					return [address]
				}
				if (args[0].method === 'eth_chainId') {
					const currentChainId = getChainId(config)
					console.log('Frame Host: returned chainId', currentChainId)
					return base.id
				}
				if (args[0].method === 'wallet_switchEthereumChain') {
					await switchChain(config, { chainId: args[0].params[0].chainId })
				}
				if (args[0].method === 'eth_sendTransaction') {
					const tx = await sendTransaction({
						to: args[0].params[0].to,
						value: args[0].params[0].value,
						data: args[0].params[0].data,
					})
					return hash
				}
			},
			on: async (...args: any[]) => {
				switch (args[0]) {
					case 'connect':
						connectFunc = args[1]
						connectFunc(address)
						break
					case 'accountsChanged':
						acctFunc = args[1]
						acctFunc([address])
						break
				}
			},
			removeListener: async (...args: any[]) => {
				console.log('Frame Host: wallet provider removeListener', args)
			},
		}
	}, [])

	// Wire up the iframe to the endpoint
	useEffect(() => {
		if (frameVisible && frameUrl) {
			const newEndpoint = createIframeEndpoint({
				iframe: iframeRef.current!,
				targetOrigin: new URL(frameUrl).origin,
				debug,
			})
			setEndpoint(newEndpoint)
		}
	}, [frameVisible, frameUrl, debug])

	const ready = useCallback(async () => {
		if (endpoint) {
			return true
		}
		return false
	}, [frameVisible, endpoint])

	const onClose = () => {
		console.log('onClose')
	}

	const handleReady = (options?: Partial<ReadyOptions>) => {
		console.log('Frame Host: ready', options)
	}

	const handleSetPrimaryButton = () => {
		console.log('Frame Host: setPrimaryButton')
	}

	const handleProviderRequest = async ({
		method,
		params,
	}: {
		method: string
		params?: any[]
	}) => {
		console.log('Frame Host: providerRequest', method, params)
		return [] as const // Return empty array for now as placeholder
	}

	const { signIn } = useSignIn()
	const handleSignIn = useCallback<FrameHost['signIn']>(
		async (options) => {
			if (isSignInComplete) {
				return { message: '', signature: '0x' }
			}

			const result = await signIn({
				name: 'Test Frame',
				domain: new URL(frameUrl || DEFAULT_FRAME_URL).hostname,
				uri: frameUrl || DEFAULT_FRAME_URL,
				options,
				renderInPortal: false,
				currentUser: {
					fid: currentUser.fid,
					username: currentUser.username,
					displayName: currentUser.displayName,
					pfpUrl: currentUser.pfpUrl,
				},
				isConnectFlow,
				walletAddress: isConnectFlow ? walletAddress : address,
				onChannelCreated: (url: string) => {
					setChannelUrl(url)
					setIsModalOpen(true)
				},
			})

			setIsSignInComplete(true)
			return result
		},
		[
			signIn,
			frameUrl,
			currentUser,
			isConnectFlow,
			isSignInComplete,
			walletAddress,
			address,
		]
	)

	const handleOpenUrl = (url: string) => {
		window.open(url, '_blank')
	}

	const handleViewProfile = () => {
		console.log('Frame Host: viewProfile')
	}

	const emit = useMemo(() => endpoint?.emit, [endpoint?.emit])

	const handleAddFrame = useCallback(async () => {
		emit?.({
			event: 'frame_added',
		})
		console.log('Frame Host: frame_added')

		return Promise.resolve<AddFrame.AddFrameResult>({})
	}, [endpoint, emit])

	const sdk = useMemo<Omit<FrameHost, 'ethProviderRequestV2'>>(
		() => ({
			context: {
				user: {
					fid: currentUser.fid,
					username: currentUser.username,
					displayName: currentUser.displayName,
					pfpUrl: currentUser.pfpUrl,
				},
				client: {
					clientFid: fid || 0,
					added: true,
				},
			},
			close: onClose,
			ready: ready,
			setPrimaryButton: handleSetPrimaryButton,
			ethProviderRequest: async () => {
				console.log('ethProviderRequest')
				throw new Error('not implemented')
			},
			signIn: handleSignIn,
			openUrl: handleOpenUrl,
			addFrame: handleAddFrame,
			viewProfile: async () => {},
			eip6963RequestProvider: () => {
				console.log('eip6963RequestProvider')
			},
		}),
		[frameVisible]
	)

	useExposeToEndpoint({
		endpoint,
		sdk,
		frameOrigin: '*',
		ethProvider: walletProvider as any,
		debug,
	})

	return (
		<div className={styles.page}>
			{/* 
			<header className={styles.header}>
				<div className={styles.urlContainer}>
					<input
						type="text"
						value={frameUrl || ''}
						onChange={(e) => {
							setFrameUrl(e.target.value)
						}}
						placeholder="Enter frame URL"
						className={`${styles.urlInput} ${styles.customInput}`}
					/>
					<input
						type="text"
						value={fid || ''}
						onChange={(e) => {
							setFid(parseInt(e.target.value))
						}}
						placeholder="Enter FID"
						className={`${styles.urlInput} ${styles.customInput}`}
					/>
					<label className={styles.toggleContainer}>
						<span>Connect Flow</span>
						<input
							type="checkbox"
							checked={isConnectFlow}
							onChange={(e) => setIsConnectFlow(e.target.checked)}
							className={styles.toggleInput}
						/>
					</label>

					{isConnectFlow && (
						<input
							type="text"
							value={walletAddress}
							onChange={(e) => setWalletAddress(e.target.value)}
							placeholder="Enter ETH wallet address"
							className={`${styles.urlInput} ${styles.customInput}`}
						/>
					)}

					{!frameVisible && (
						<button
							onClick={() => setFrameVisible(true)}
							className={styles.loadFrameButton}
						>
							Load Frame
						</button>
					)}
					{frameVisible && (
						<button
							onClick={() => setFrameVisible(false)}
							className={styles.loadFrameButton}
						>
							Close Frame
						</button>
					)}
				</div>
			</header>
			*/}

			<main className={styles.main}>
				{/* 
				{isModalOpen && channelUrl && (
					<div
						className={styles.modalOverlay}
						onClick={() => setIsModalOpen(false)}
					>
						<div className={styles.modal} onClick={(e) => e.stopPropagation()}>
							<h3>Connect with Warpcast</h3>
							<p>Scan this QR code or click the link to connect:</p>
							<img
								src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
									channelUrl
								)}`}
								alt="QR Code"
								className={styles.qrCode}
							/>
							<a
								href={channelUrl}
								target="_blank"
								rel="noopener noreferrer"
								className={styles.channelLink}
							>
								Open Link
							</a>
							<button
								onClick={() => setIsModalOpen(false)}
								className={styles.closeButton}
							>
								Close
							</button>
						</div>
					</div>
				)}
				*/}
				<div className={styles.frameContainer}>
					{/* 
					<div>
						<h3>Frame Content</h3>
					</div>
					*/}
					<iframe
						ref={iframeRef}
						src={frameUrl || DEFAULT_FRAME_URL}
						width="424"
						height="695"
						className={styles.frameIframe}
						allow="microphone; camera; clipboard-write; web-share"
						sandbox="allow-scripts allow-same-origin allow-popups"
					/>
				</div>
			</main>

			{/*
			<footer className={styles.footer}>
				<div className={styles.interactionButtons}>
					<button onClick={handleAddFrame} className={styles.interactionButton}>
						Ready
					</button>
				</div>
			</footer>
			*/}
		</div>
	)
}
