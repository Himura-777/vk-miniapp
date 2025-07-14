import React, { useEffect, useState } from "react";
import bridge from "@vkontakte/vk-bridge";
import {
	AppRoot,
	View,
	Panel,
	PanelHeader,
	Group,
	Header,
	Button,
	FormItem,
	Textarea,
	Select,
	Snackbar,
	Avatar,
	Card,
	Div,
	ConfigProvider,
	Progress,
	Calendar,
} from "@vkontakte/vkui";
import {
	Icon28FireOutline,
	Icon20CheckCircleFillGreen,
} from "@vkontakte/icons";
import "@vkontakte/vkui/dist/vkui.css";
import Masonry from "react-masonry-css";
import "./App.css"; // добавь кастомный CSS-файл

const MOODS = [
	{ value: "happy", label: "😃 Радостно" },
	{ value: "neutral", label: "😐 Нормально" },
	{ value: "sad", label: "😢 Грустно" },
	{ value: "angry", label: "😠 Злость" },
	{ value: "tired", label: "😴 Усталость" },
];

const getTodayDate = () => new Date().toISOString().split("T")[0];

const App = () => {
	const [user, setUser] = useState(null);
	const [mood, setMood] = useState("");
	const [note, setNote] = useState("");
	const [data, setData] = useState({});
	const [snackbar, setSnackbar] = useState(null);
	const [selectedDate, setSelectedDate] = useState(getTodayDate());
	const [editingEntry, setEditingEntry] = useState(null);

	useEffect(() => {
		bridge.send("VKWebAppInit");
		bridge.send("VKWebAppGetUserInfo").then(setUser);
		bridge.send("VKWebAppStorageGet", { keys: ["moodData"] }).then(r => {
			const stored = r.keys[0]?.value || "{}";
			try {
				const parsed = JSON.parse(stored);
				setData(parsed);

				const today = getTodayDate();
				if (!parsed[today]) {
					setSnackbar(
						<Snackbar onClose={() => setSnackbar(null)}>
							Не забудь отметить своё настроение сегодня!
						</Snackbar>
					);
					bridge.send("VKWebAppShowNotification", {
						message: "Отметь своё настроение сегодня 😊",
					});
				}
			} catch {
				setData({});
			}
		});
	}, []);

	useEffect(() => {
		setEditingEntry(null);
	}, [data]);

	const saveData = async newData => {
		setData(newData);
		await bridge.send("VKWebAppStorageSet", {
			key: "moodData",
			value: JSON.stringify(newData),
		});
	};

	const saveMood = async () => {
		setMood("");
		setNote("");

		const today = getTodayDate();
		const entry = { mood, note, time: new Date().toLocaleTimeString() };
		const updatedDayData = data[today] ? [...data[today], entry] : [entry];
		const newData = { ...data, [today]: updatedDayData };
		await saveData(newData);

		setSnackbar(
			<Snackbar onClose={() => setSnackbar(null)}>
				Настроение сохранено!
			</Snackbar>
		);
	};

	const deleteEntry = async (date, index) => {
		const updated = [...data[date]];
		updated.splice(index, 1);
		const newData = { ...data };
		if (updated.length > 0) {
			newData[date] = updated;
		} else {
			delete newData[date];
		}
		await saveData(newData);
	};

	const updateEntry = async () => {
		if (!editingEntry) return;

		const { date, index, mood, note } = editingEntry;
		const updated = [...data[date]];
		updated[index] = { ...updated[index], mood, note };

		const newData = { ...data, [date]: updated };
		await saveData(newData);
		setEditingEntry(null);
		setSnackbar(
			<Snackbar onClose={() => setSnackbar(null)}>Запись обновлена!</Snackbar>
		);
	};

	const moodStats = () => {
		const stats = {};
		Object.values(data).forEach(day => {
			day.forEach(entry => {
				stats[entry.mood] = (stats[entry.mood] || 0) + 1;
			});
		});
		return stats;
	};

	const totalEntries = Object.values(data).reduce(
		(sum, day) => sum + day.length,
		0
	);

	const calculateStreak = () => {
		const sortedDates = Object.keys(data).sort(
			(a, b) => new Date(b) - new Date(a)
		);
		let streak = 0;
		let currentDate = new Date(getTodayDate());

		for (let i = 0; i < sortedDates.length; i++) {
			const date = new Date(sortedDates[i]);
			if (currentDate.toDateString() === date.toDateString()) {
				streak++;
				currentDate.setDate(currentDate.getDate() - 1);
			} else {
				break;
			}
		}
		return streak;
	};

	const renderBadge = streak => {
		if (streak >= 14) return "🥇 Гуру самонаблюдения!";
		if (streak >= 7) return "🥈 Настроение под контролем!";
		if (streak >= 3) return "🥉 Молодец!";
		return "Продолжай в том же духе!";
	};

	const weekdayStats = () => {
		const days = [
			"Воскресенье",
			"Понедельник",
			"Вторник",
			"Среда",
			"Четверг",
			"Пятница",
			"Суббота",
		];
		const stats = {};
		Object.entries(data).forEach(([date, entries]) => {
			const dayIndex = new Date(date).getDay();
			const dayName = days[dayIndex];
			stats[dayName] = (stats[dayName] || 0) + entries.length;
		});
		return stats;
	};

	const breakpointColumnsObj = {
		default: 3,
		780: 2,
		360: 1,
	};

	return (
		<ConfigProvider>
			<AppRoot>
				<View activePanel='main'>
					<Panel id='main'>
						<PanelHeader>Дневник Настроения</PanelHeader>

						{user && (
							<Group
								header={
									<Header mode='secondary'>Привет, {user.first_name}!</Header>
								}
							>
								<Div style={{ textAlign: "center" }}>
									<Avatar size={72} src={user.photo_200} />
								</Div>
							</Group>
						)}
						<Masonry
							breakpointCols={breakpointColumnsObj}
							className='cards-container'
							columnClassName='cards-column'
						>
							<div className='card'>
								<Group
									header={<Header mode='primary'>Текущее настроение</Header>}
								>
									<FormItem top='Как вы себя чувствуете?'>
										<Select
											placeholder='Выберите настроение'
											options={MOODS}
											value={mood}
											onChange={e => setMood(e.target.value)}
										/>
									</FormItem>
									<FormItem top='Комментарий (необязательно)'>
										<Textarea
											value={note}
											onChange={e => setNote(e.target.value)}
										/>
									</FormItem>
									<Div>
										<Button
											size='l'
											stretched
											onClick={saveMood}
											disabled={!mood}
										>
											Сохранить
										</Button>
									</Div>
								</Group>
							</div>

							<div className='card'>
								<Group header={<Header mode='primary'>Статистика</Header>}>
									{totalEntries === 0 ? (
										<Div>Нет записей</Div>
									) : (
										Object.entries(moodStats()).map(([m, count]) => {
											const moodLabel =
												MOODS.find(x => x.value === m)?.label || m;
											const percent = ((count / totalEntries) * 100).toFixed(1);
											return (
												<Div key={m}>
													{moodLabel}: {count} раз(а)
													<Progress value={percent} />
												</Div>
											);
										})
									)}
								</Group>
							</div>

							<div className='card'>
								<Group header={<Header mode='primary'>По дням недели</Header>}>
									{totalEntries === 0 ? (
										<Div>Нет записей</Div>
									) : (
										Object.entries(weekdayStats()).map(([day, count]) => {
											const percent = ((count / totalEntries) * 100).toFixed(1);
											return (
												<Div key={day}>
													{day}: {count} записей
													<Progress value={percent} />
												</Div>
											);
										})
									)}
								</Group>
							</div>

							<div className='card'>
								<Group header={<Header mode='primary'>Твоя активность</Header>}>
									<Div
										style={{
											display: "flex",
											flexDirection: "column",
											gap: "8px",
										}}
									>
										<div
											style={{
												display: "flex",
												gap: "8px",
											}}
										>
											<Icon28FireOutline
												style={{
													verticalAlign: "middle",
													textAlign: "center",
													width: "30px",
												}}
											/>{" "}
											Стрик: {calculateStreak()} дней подряд
										</div>
										<div
											style={{
												display: "flex",
												gap: "8px",
											}}
										>
											<Icon20CheckCircleFillGreen
												style={{
													verticalAlign: "middle",
													textAlign: "center",
													width: "30px",
												}}
											/>{" "}
											{renderBadge(calculateStreak())}
										</div>
									</Div>
								</Group>
							</div>

							<div className='card'>
								<Group header={<Header mode='primary'>Выберите дату</Header>}>
									<Calendar
										style={{ width: "100%" }}
										value={new Date(selectedDate)}
										onChange={date => {
											const formatted = date.toISOString().split("T")[0];
											setSelectedDate(formatted);
										}}
									/>
								</Group>
							</div>

							<div className='card'>
								<Group
									style={{
										display: "flex",
										flexDirection: "column",
										gap: "8px",
									}}
									header={
										<Header mode='primary'>История за {selectedDate}</Header>
									}
								>
									{data[selectedDate]?.length > 0 ? (
										data[selectedDate].map((entry, index) => {
											const label =
												MOODS.find(x => x.value === entry.mood)?.label ||
												entry.mood;
											const isEditing =
												editingEntry &&
												editingEntry.date === selectedDate &&
												editingEntry.index === index;

											if (isEditing) {
												return (
													<Card key={`${selectedDate}-${index}-${entry.time}`}>
														<Div>
															<FormItem top='Настроение'>
																<Select
																	options={MOODS}
																	value={editingEntry.mood}
																	onChange={e =>
																		setEditingEntry({
																			...editingEntry,
																			mood: e.target.value,
																		})
																	}
																/>
															</FormItem>
															<FormItem top='Комментарий'>
																<Textarea
																	value={editingEntry.note}
																	onChange={e =>
																		setEditingEntry({
																			...editingEntry,
																			note: e.target.value,
																		})
																	}
																/>
															</FormItem>
															<Div style={{ display: "flex", gap: "8px" }}>
																<Button
																	style={{ flexGrow: 1 }}
																	size='s'
																	onClick={updateEntry}
																>
																	Сохранить
																</Button>
																<Button
																	style={{ flexGrow: 1 }}
																	size='s'
																	mode='secondary'
																	onClick={() => setEditingEntry(null)}
																>
																	Отмена
																</Button>
															</Div>
														</Div>
													</Card>
												);
											}

											return (
												<Card key={index}>
													<Div>
														<b>{label}</b> в {entry.time}
														{entry.note && <div>Комментарий: {entry.note}</div>}
														<Div>
															<Button
																style={{ display: "block", width: "100%" }}
																size='s'
																onClick={() =>
																	setEditingEntry({
																		date: selectedDate,
																		index,
																		mood: entry.mood,
																		note: entry.note || "",
																	})
																}
															>
																Редактировать
															</Button>
															<Button
																style={{
																	display: "block",
																	width: "100%",
																	marginTop: "12px",
																}}
																size='s'
																mode='destructive'
																onClick={() => deleteEntry(selectedDate, index)}
															>
																Удалить
															</Button>
														</Div>
													</Div>
												</Card>
											);
										})
									) : (
										<Div>Нет записей</Div>
									)}
								</Group>
							</div>
						</Masonry>

						{snackbar}
					</Panel>
				</View>
			</AppRoot>
		</ConfigProvider>
	);
};

export default App;
