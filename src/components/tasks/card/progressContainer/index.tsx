import { FC, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import { toast, ToastTypes } from '@/helperFunctions/toast';
import {
    useUpdateSelfTaskMutation,
    useUpdateTaskMutation,
} from '@/app/services/tasksApi';
import useUserData from '@/hooks/useUserData';
import { useGetUserQuery } from '@/app/services/userApi';
import ProgressText from './ProgressText';
import Progressbar from './ProgressBar';
import CompletionModal from '@/components/Modal/CompletionModal';
import { ERROR_MESSAGE, PROGRESS_SUCCESSFUL } from '@/constants/constants';
import styles from '@/components/tasks/card/card.module.scss';
import { ProgressContainerProps } from '@/interfaces/task.type';

const ProgressContainer: FC<ProgressContainerProps> = ({
    content,
    readOnly = false,
}) => {
    const router = useRouter();
    const { dev } = router.query;
    const isDev = dev === 'true';

    const [isProgressMade, setIsProgressMade] = useState<boolean>(false);
    const [progressValue, setProgressValue] = useState<number>(
        content.percentCompleted
    );
    const [showModal, setShowModal] = useState(false);

    const { isUserAuthorized } = useUserData();
    const { data: userData } = useGetUserQuery();
    const [updateTask, { isLoading: isLoadingUpdateTaskDetails }] =
        useUpdateTaskMutation();
    const [updateSelfTask, { isLoading: isLoadingSelfTaskUpdate }] =
        useUpdateSelfTaskMutation();

    const checkingLoading =
        isLoadingUpdateTaskDetails || isLoadingSelfTaskUpdate;

    const { SUCCESS, ERROR } = ToastTypes;

    const handleSliderChangeComplete = useCallback(
        (id: string, percentCompleted: number) => {
            const taskData = {
                percentCompleted: percentCompleted,
            };

            const updatePromise = isUserAuthorized
                ? updateTask({ task: taskData, id: id })
                : updateSelfTask({ task: taskData, id: id });

            updatePromise
                .unwrap()
                .then(() => {
                    toast(SUCCESS, PROGRESS_SUCCESSFUL);
                    if (percentCompleted === 100 && isDev) {
                        setShowModal(true);
                    }
                })
                .catch(() => toast(ERROR, ERROR_MESSAGE));
        },
        [isUserAuthorized, updateTask, updateSelfTask, isDev, SUCCESS, ERROR]
    );

    const onProgressChange = useCallback(() => {
        handleSliderChangeComplete(content.id, progressValue);
        setIsProgressMade(false);
    }, [content.id, progressValue, handleSliderChangeComplete]);

    const debounceSlider = useCallback(
        (debounceTimeOut: number) => {
            if (debounceTimeOut) {
                clearTimeout(debounceTimeOut);
            }
            setTimeout(() => {
                onProgressChange();
            }, 1000);
        },
        [onProgressChange]
    );

    const handleProgressChange = (
        event: React.ChangeEvent<HTMLInputElement>
    ) => {
        const newValue = Number(event.target.value);
        setProgressValue(newValue);
    };

    const handleProgressUpdate = () => {
        if (
            content.assignee === userData?.username ||
            !!userData?.roles.super_user
        ) {
            setIsProgressMade((prev) => !prev);
        } else {
            toast(ERROR, 'You cannot update progress');
        }
    };

    const handleModalClose = useCallback(() => {
        setShowModal(false);
    }, []);

    const showUpdateButton = () => {
        if (
            !readOnly &&
            (content.assignee === userData?.username ||
                !!userData?.roles.super_user)
        ) {
            return (
                <ProgressText
                    handleProgressUpdate={handleProgressUpdate}
                    isLoading={checkingLoading}
                />
            );
        }
        return null;
    };

    return (
        <>
            <div className={styles.progressContainerUpdated}>
                <Progressbar
                    progress={!readOnly && isProgressMade}
                    progressValue={progressValue}
                    percentCompleted={progressValue}
                    handleProgressChange={handleProgressChange}
                    debounceSlider={debounceSlider}
                    startedOn={content.startedOn}
                    endsOn={String(content.endsOn)}
                    isLoading={checkingLoading}
                    readOnly={readOnly}
                />
                {showUpdateButton()}
            </div>

            {isDev && (
                <CompletionModal
                    isOpen={showModal}
                    onClose={handleModalClose}
                    onStatusChange={() => {
                        handleModalClose();
                    }}
                />
            )}
        </>
    );
};

export default ProgressContainer;
